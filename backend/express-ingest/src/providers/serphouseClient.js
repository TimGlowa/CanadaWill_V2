const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class SerphouseClient {
  constructor(apiToken, maxConcurrency = 6, delayMs = 300, pageMax = 3, weekliesFile = null) {
    this.apiToken = apiToken;
    this.maxConcurrency = maxConcurrency;
    this.delayMs = delayMs;
    this.pageMax = pageMax;
    this.weekliesFile = weekliesFile;
    this.baseUrl = 'https://api.serphouse.com/v1/search';
  }

  async searchPerson(person, days = 365, limit = 1000) {
    try {
      const query = this.buildSearchQuery(person);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let weeklies = [];
      if (this.weekliesFile) {
        try {
          weeklies = JSON.parse(await fs.readFile(this.weekliesFile, 'utf8'));
        } catch (error) {
          console.log(`Warning: Could not load weeklies file: ${error.message}`);
        }
      }

      const results = [];
      let totalResults = 0;

      for (let page = 1; page <= this.pageMax; page++) {
        const response = await this.makeSerphouseRequest({
          q: query,
          num: limit,
          start: (page - 1) * limit,
          date_start: startDate.toISOString().split('T')[0],
          date_end: endDate.toISOString().split('T')[0],
          include_domains: weeklies.length > 0 ? weeklies.join(',') : undefined,
          gl: 'ca',
          hl: 'en'
        });

        if (response && response.organic_results) {
          results.push(...response.organic_results);
          totalResults += response.organic_results.length;
          
          // If we got fewer results than requested, we've reached the end
          if (response.organic_results.length < limit) {
            break;
          }
        }

        // Rate limiting delay between pages
        if (page < this.pageMax) {
          await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }
      }

      return {
        success: true,
        person: person.slug,
        query,
        results,
        totalResults,
        pages: Math.min(this.pageMax, Math.ceil(totalResults / limit))
      };

    } catch (error) {
      return {
        success: false,
        person: person.slug,
        error: error.message,
        query: this.buildSearchQuery(person)
      };
    }
  }

  buildSearchQuery(person) {
    // Define separation keywords (negatives)
    const separationKeywords = [
      "Alberta separation",
      "Alberta independence", 
      "Alberta sovereignty",
      "Sovereignty Act",
      "referendum",
      "secede",
      "secession",
      "leave Canada",
      "break from Canada",
      "Alberta Prosperity Project",
      "Forever Canada",
      "Forever Canadian"
    ];

    // Define unity keywords (positives)
    const unityKeywords = [
      "remain in Canada",
      "stay in Canada", 
      "support Canada",
      "oppose separation",
      "oppose independence",
      "pro-Canada stance",
      "keep Alberta in Canada"
    ];

    // Combine all keywords
    const allKeywords = [...separationKeywords, ...unityKeywords];

    // Determine title variants based on office
    let titleVariants = [];
    if (person.office === "Member of Legislative Assembly") {
      titleVariants = ["MLA", "Member of Legislative Assembly"];
    } else if (person.office === "Member of Parliament") {
      titleVariants = ["MP", "Member of Parliament"];
    } else {
      // Fallback for other office types
      titleVariants = [person.office];
    }

    // Build the query following the exact specification:
    // "<FullName>" AND ("<Title Variants>") AND (<keywords>)
    const fullName = `"${person.fullName}"`;
    const titleClause = `(${titleVariants.map(v => `"${v}"`).join(' OR ')})`;
    const keywordClause = `(${allKeywords.map(k => `"${k}"`).join(' OR ')})`;

    const query = `${fullName} ${titleClause} AND ${keywordClause}`;

    // Log the exact query for debugging/reproducibility
    console.log(`[QUERY BUILDER] Generated query for ${person.slug}: ${query}`);

    return query;
  }

  async makeSerphouseRequest(params) {
    const url = new URL(this.baseUrl);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await axios.get(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  }

  async processRoster(roster, scope = 'mlas,mps', only = null, days = 365, limit = 1000) {
    // Filter roster by scope
    let filteredRoster = roster;
    if (scope) {
      const scopes = scope.split(',').map(s => s.trim());
      filteredRoster = roster.filter(person => scopes.includes(person.level));
    }

    // Filter by specific people if 'only' parameter is provided
    if (only) {
      const onlySlugs = only.split(',').map(s => s.trim());
      filteredRoster = filteredRoster.filter(person => onlySlugs.includes(person.slug));
    }

    console.log(`Processing ${filteredRoster.length} people with scope: ${scope}, days: ${days}, limit: ${limit}`);

    const results = [];
    const errors = [];
    let totalArticles = 0;
    let processedCount = 0;

    // Process in chunks for concurrency control
    const chunks = this.chunkArray(filteredRoster, this.maxConcurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (person) => {
        processedCount++;
        console.log(`[${processedCount}/${filteredRoster.length}] Processing ${person.fullName} (${person.slug})...`);
        
        const result = await this.searchPerson(person, days, limit);
        
        if (result.success) {
          totalArticles += result.totalResults;
          results.push(result);
          console.log(`[${processedCount}/${filteredRoster.length}] ✅ ${person.fullName}: ${result.totalResults} articles found`);
        } else {
          errors.push({
            slug: person.slug,
            reason: result.error
          });
          console.log(`[${processedCount}/${filteredRoster.length}] ❌ ${person.fullName}: ${result.error}`);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      });

      await Promise.all(chunkPromises);
    }

    return {
      peopleProcessed: filteredRoster.length,
      articlesFound: totalArticles,
      results,
      errors
    };
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = SerphouseClient;
