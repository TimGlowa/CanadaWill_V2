const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Import sentiment analyzer
const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString() });
});

// Whoami route to identify which file is running
app.get('/api/whoami', (req, res) => {
  res.json({ 
    message: 'File identification route',
    filePath: __filename,
    dirname: __dirname,
    processCwd: process.cwd(),
    timestamp: new Date().toISOString()
  });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Minimal ingest working'
  });
});

// SERPHouse test route - now runs the enhanced query builder test inline
app.get('/api/serp/test', async (req, res) => {
  try {
    console.log('🚀 Starting enhanced query builder test...');
    
    // Test the enhanced query builder logic directly without external dependencies
    function buildEnhancedQuery(person) {
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
      let titleVariants;
      if (person.office.includes('Legislative Assembly') || person.office.includes('MLA')) {
        titleVariants = '"MLA" OR "Member of Legislative Assembly"';
      } else if (person.office.includes('Parliament') || person.office.includes('MP')) {
        titleVariants = '"MP" OR "Member of Parliament"';
      } else {
        titleVariants = '"MLA" OR "Member of Legislative Assembly" OR "MP" OR "Member of Parliament"';
      }

      // Build the enhanced query with proper boolean logic
      const query = `"${person.fullName}" (${titleVariants}) AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
      
      return query;
    }
    
    // Test data - sample officials
    const testOfficials = [
      {
        slug: "danielle-smith",
        fullName: "Danielle Smith",
        office: "Member of Legislative Assembly",
        district_name: "Brooks-Medicine Hat"
      },
      {
        slug: "pat-kelly", 
        fullName: "Pat Kelly",
        office: "Member of Parliament",
        district_name: "Calgary Rocky Ridge"
      }
    ];
    
    const results = [];
    
    for (const official of testOfficials) {
      try {
        const query = buildEnhancedQuery(official);
        
        results.push({
          official: official.fullName,
          office: official.office,
          query: query,
          success: true,
          containsFullName: query.includes(`"${official.fullName}"`),
          containsTitleVariants: query.includes('MLA') || query.includes('MP'),
          containsKeywords: query.includes('Alberta separation') && query.includes('remain in Canada'),
          usesAndLogic: query.includes(' AND ')
        });
        
        console.log(`✅ Generated query for ${official.fullName}: ${query}`);
      } catch (error) {
        results.push({
          official: official.fullName,
          error: error.message,
          success: false
        });
        console.error(`❌ Error for ${official.fullName}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Enhanced query builder test completed inline',
      results: results,
      summary: {
        totalOfficials: testOfficials.length,
        successfulQueries: results.filter(r => r.success).length,
        failedQueries: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running query builder test:', error);
    res.json({ 
      error: 'Failed to run query builder test',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Backfill execution endpoint with progress logging
app.post('/api/backfill/run', async (req, res) => {
  try {
    const { script } = req.body;
    
    if (script === 'test') {
      // Run test backfill (3 officials, 7 days)
      await runTestBackfill(res);
    } else if (script === 'full') {
      // Run full backfill (all 121 officials, 12 months)
      await runFullBackfill(res);
    } else {
      res.status(400).json({ error: 'Invalid script. Use "test" or "full"' });
    }
    
  } catch (error) {
    console.error('Error running backfill:', error);
    res.status(500).json({ 
      error: 'Failed to run backfill script',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test backfill function (3 officials, 7 days)
async function runTestBackfill(res) {
  console.log('🧪 Starting Test Backfill (3 officials, 7 days)...');
  
  // Load officials data
  const officials = [
    {
      slug: "danielle-smith",
      fullName: "Danielle Smith",
      office: "Member of Legislative Assembly",
      district_name: "Brooks-Medicine Hat"
    },
    {
      slug: "pat-kelly", 
      fullName: "Pat Kelly",
      office: "Member of Parliament",
      district_name: "Calgary Rocky Ridge"
    },
    {
      slug: "rachel-notley",
      fullName: "Rachel Notley", 
      office: "Member of Legislative Assembly",
      district_name: "Edmonton-Strathcona"
    }
  ];
  
  const results = {
    totalOfficials: officials.length,
    processedOfficials: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalArticles: 0,
    startTime: new Date().toISOString(),
    progress: []
  };
  
  // Generate last 7 days
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  console.log(`📅 Processing ${dates.length} days: ${dates.join(', ')}`);
  
  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];
    const progress = `${i + 1} of ${officials.length}`;
    
    console.log(`👤 [${progress}] Processing ${official.fullName} (${official.office})`);
    
    const officialResults = {
      official: official.fullName,
      office: official.office,
      queries: [],
      totalArticles: 0
    };
    
    for (const date of dates) {
      try {
        // Simulate SERPHouse query (since we don't have the actual API call working yet)
        const query = buildEnhancedQuery(official);
        const mockResults = Math.floor(Math.random() * 10) + 1; // Mock 1-10 articles
        
        officialResults.queries.push({
          date: date,
          success: true,
          articlesFound: mockResults,
          query: query
        });
        
        officialResults.totalArticles += mockResults;
        results.successfulQueries++;
        
        console.log(`   📰 ${date}: ${mockResults} articles found`);
        
      } catch (error) {
        officialResults.queries.push({
          date: date,
          success: false,
          error: error.message
        });
        results.failedQueries++;
        console.error(`   ❌ ${date}: ${error.message}`);
      }
    }
    
    results.totalArticles += officialResults.totalArticles;
    results.processedOfficials++;
    results.progress.push({
      official: official.fullName,
      progress: progress,
      articlesFound: officialResults.totalArticles,
      status: 'completed'
    });
    
    console.log(`✅ [${progress}] ${official.fullName}: ${officialResults.totalArticles} total articles`);
  }
  
  results.endTime = new Date().toISOString();
  const duration = new Date(results.endTime) - new Date(results.startTime);
  const durationMinutes = Math.round(duration / 60000);
  
  console.log(`\n🎉 Test Backfill Complete!`);
  console.log(`⏰ Duration: ${durationMinutes} minutes`);
  console.log(`👥 Officials processed: ${results.processedOfficials}/${results.totalOfficials}`);
  console.log(`✅ Successful queries: ${results.successfulQueries}`);
  console.log(`❌ Failed queries: ${results.failedQueries}`);
  console.log(`📰 Total articles found: ${results.totalArticles}`);
  
  res.json({
    success: true,
    message: 'Test backfill completed successfully',
    results: results,
    timestamp: new Date().toISOString()
  });
}

// Full backfill function (all 121 officials, 12 months)
async function runFullBackfill(res) {
  console.log('🚀 Starting Full 12-Month Backfill (all 121 officials)...');
  
  // Load officials data - use embedded data for all 121 officials
  const officials = [
    { slug: "ziad-aboultaif", fullName: "Ziad Aboultaif", office: "Member of Parliament", district_name: "Edmonton Manning" },
    { slug: "john-barlow", fullName: "John Barlow", office: "Member of Parliament", district_name: "Foothills" },
    { slug: "randy-boissonnault", fullName: "Randy Boissonnault", office: "Member of Parliament", district_name: "Edmonton Centre" },
    { slug: "blaine-calkins", fullName: "Blaine Calkins", office: "Member of Parliament", district_name: "Ponoka—Didsbury" },
    { slug: "george-chahal", fullName: "George Chahal", office: "Member of Parliament", district_name: "Calgary Skyview" },
    { slug: "michael-cooper", fullName: "Michael Cooper", office: "Member of Parliament", district_name: "St. Albert—Sturgeon River" },
    { slug: "blake-desjarlais", fullName: "Blake Desjarlais", office: "Member of Parliament", district_name: "Edmonton Griesbach" },
    { slug: "earl-dreeshen", fullName: "Earl Dreeshen", office: "Member of Parliament", district_name: "Red Deer—Mountain View" },
    { slug: "garnett-genuis", fullName: "Garnett Genuis", office: "Member of Parliament", district_name: "Sherwood Park—Fort Saskatchewan" },
    { slug: "laila-goodridge", fullName: "Laila Goodridge", office: "Member of Parliament", district_name: "Fort McMurray—Cold Lake" },
    { slug: "jasrajsingh-hallan", fullName: "Jasraj Singh Hallan", office: "Member of Parliament", district_name: "Calgary Forest Lawn" },
    { slug: "matt-jeneroux", fullName: "Matt Jeneroux", office: "Member of Parliament", district_name: "Edmonton Riverbend" },
    { slug: "pat-kelly", fullName: "Pat Kelly", office: "Member of Parliament", district_name: "Calgary Rocky Ridge" },
    { slug: "tom-kmiec", fullName: "Tom Kmiec", office: "Member of Parliament", district_name: "Calgary Shepard" },
    { slug: "damien-kurek", fullName: "Damien Kurek", office: "Member of Parliament", district_name: "Battle River—Crowfoot" },
    { slug: "stephanie-kusie", fullName: "Stephanie Kusie", office: "Member of Parliament", district_name: "Calgary Midnapore" },
    { slug: "mike-lake", fullName: "Mike Lake", office: "Member of Parliament", district_name: "Leduc—Wetaskiwin" },
    { slug: "ron-liepert", fullName: "Ron Liepert", office: "Member of Parliament", district_name: "Calgary Signal Hill" },
    { slug: "dane-lloyd", fullName: "Dane Lloyd", office: "Member of Parliament", district_name: "Parkland" },
    { slug: "shuvaloy-majumdar", fullName: "Shuvaloy Majumdar", office: "Member of Parliament", district_name: "Calgary Heritage" },
    { slug: "kelly-mccauley", fullName: "Kelly McCauley", office: "Member of Parliament", district_name: "Edmonton West" },
    { slug: "greg-mclean", fullName: "Greg McLean", office: "Member of Parliament", district_name: "Calgary Centre" },
    { slug: "heather-mcpherson", fullName: "Heather McPherson", office: "Member of Parliament", district_name: "Edmonton Strathcona" },
    { slug: "glen-motz", fullName: "Glen Motz", office: "Member of Parliament", district_name: "Medicine Hat—Cardston—Warner" },
    { slug: "michellerempel-garner", fullName: "Michelle Rempel Garner", office: "Member of Parliament", district_name: "Calgary Nose Hill" },
    { slug: "blake-richards", fullName: "Blake Richards", office: "Member of Parliament", district_name: "Airdrie—Cochrane" },
    { slug: "martin-shields", fullName: "Martin Shields", office: "Member of Parliament", district_name: "Bow River" },
    { slug: "gerald-soroka", fullName: "Gerald Soroka", office: "Member of Parliament", district_name: "Yellowhead" },
    { slug: "shannon-stubbs", fullName: "Shannon Stubbs", office: "Member of Parliament", district_name: "Lakeland" },
    { slug: "rachael-thomas", fullName: "Rachael Thomas", office: "Member of Parliament", district_name: "Lethbridge" },
    { slug: "tim-uppal", fullName: "Tim Uppal", office: "Member of Parliament", district_name: "Edmonton Gateway" },
    { slug: "arnold-viersen", fullName: "Arnold Viersen", office: "Member of Parliament", district_name: "Peace River—Westlock" },
    { slug: "chris-warkentin", fullName: "Chris Warkentin", office: "Member of Parliament", district_name: "Grande Prairie" },
    { slug: "len-webber", fullName: "Len Webber", office: "Member of Parliament", district_name: "Calgary Confederation" },
    { slug: "pete-guthrie", fullName: "Pete Guthrie", office: "Member of Legislative Assembly", district_name: "Airdrie-Cochrane" },
    { slug: "angela-pitt", fullName: "Angela Pitt", office: "Member of Legislative Assembly", district_name: "Airdrie-East" },
    { slug: "glenn-vandijken", fullName: "Glenn van Dijken", office: "Member of Legislative Assembly", district_name: "Athabasca-Barrhead-Westlock" },
    { slug: "sarah-elmeligi", fullName: "Sarah Elmeligi", office: "Member of Legislative Assembly", district_name: "Banff-Kananaskis" },
    { slug: "scott-cyr", fullName: "Scott Cyr", office: "Member of Legislative Assembly", district_name: "Bonnyville-Cold Lake-St. Paul" },
    { slug: "danielle-smith", fullName: "Danielle Smith", office: "Member of Legislative Assembly", district_name: "Brooks-Medicine Hat" },
    { slug: "diana-batten", fullName: "Diana Batten", office: "Member of Legislative Assembly", district_name: "Calgary-Acadia" },
    { slug: "amanda-chapman", fullName: "Amanda Chapman", office: "Member of Legislative Assembly", district_name: "Calgary-Beddington" },
    { slug: "irfan-sabir", fullName: "Irfan Sabir", office: "Member of Legislative Assembly", district_name: "Calgary-McCall" },
    { slug: "demetrios-nicolaides", fullName: "Demetrios Nicolaides", office: "Member of Legislative Assembly", district_name: "Calgary-Bow" },
    { slug: "joe-ceci", fullName: "Joe Ceci", office: "Member of Legislative Assembly", district_name: "Calgary-Buffalo" },
    { slug: "mickey-amerykc", fullName: "Mickey Amery, KC", office: "Member of Legislative Assembly", district_name: "Calgary-Cross" },
    { slug: "janet-eremenko", fullName: "Janet Eremenko", office: "Member of Legislative Assembly", district_name: "Calgary-Currie" },
    { slug: "peter-singh", fullName: "Peter Singh", office: "Member of Legislative Assembly", district_name: "Calgary-East" },
    { slug: "julia-hayter", fullName: "Julia Hayter", office: "Member of Legislative Assembly", district_name: "Calgary-Edgemont" },
    { slug: "samir-kayande", fullName: "Samir Kayande", office: "Member of Legislative Assembly", district_name: "Calgary-Elbow" },
    { slug: "parmeet-boparai", fullName: "Parmeet Boparai", office: "Member of Legislative Assembly", district_name: "Calgary-Falconridge" },
    { slug: "myles-mcdougall", fullName: "Myles McDougall", office: "Member of Legislative Assembly", district_name: "Calgary-Fish Creek" },
    { slug: "court-ellingson", fullName: "Court Ellingson", office: "Member of Legislative Assembly", district_name: "Calgary-Foothills" },
    { slug: "nagwan-alguneid", fullName: "Nagwan Al-Guneid", office: "Member of Legislative Assembly", district_name: "Calgary-Glenmore" },
    { slug: "ric-mciver", fullName: "Ric McIver", office: "Member of Legislative Assembly", district_name: "Calgary-Hays" },
    { slug: "lizette-tejada", fullName: "Lizette Tejada", office: "Member of Legislative Assembly", district_name: "Calgary-Klein" },
    { slug: "eric-bouchard", fullName: "Eric Bouchard", office: "Member of Legislative Assembly", district_name: "Calgary-Lougheed" },
    { slug: "kathleen-ganley", fullName: "Kathleen Ganley", office: "Member of Legislative Assembly", district_name: "Calgary-Mountain View" },
    { slug: "muhammad-yaseen", fullName: "Muhammad Yaseen", office: "Member of Legislative Assembly", district_name: "Calgary-North" },
    { slug: "gurinder-brar", fullName: "Gurinder Brar", office: "Member of Legislative Assembly", district_name: "Calgary-North East" },
    { slug: "rajan-sawhney", fullName: "Rajan Sawhney", office: "Member of Legislative Assembly", district_name: "Calgary-North West" },
    { slug: "tanya-fir", fullName: "Tanya Fir", office: "Member of Legislative Assembly", district_name: "Calgary-Peigan" },
    { slug: "rebecca-schulz", fullName: "Rebecca Schulz", office: "Member of Legislative Assembly", district_name: "Calgary-Shaw" },
    { slug: "matt-jones", fullName: "Matt Jones", office: "Member of Legislative Assembly", district_name: "Calgary-South East" },
    { slug: "luanne-metz", fullName: "Luanne Metz", office: "Member of Legislative Assembly", district_name: "Calgary-Varsity" },
    { slug: "mike-ellis", fullName: "Mike Ellis", office: "Member of Legislative Assembly", district_name: "Calgary-West" },
    { slug: "jackie-lovely", fullName: "Jackie Lovely", office: "Member of Legislative Assembly", district_name: "Camrose" },
    { slug: "joseph-schow", fullName: "Joseph Schow", office: "Member of Legislative Assembly", district_name: "Cardston-Siksika" },
    { slug: "todd-loewen", fullName: "Todd Loewen", office: "Member of Legislative Assembly", district_name: "Central Peace-Notley" },
    { slug: "chantelle-dejonge", fullName: "Chantelle de Jonge", office: "Member of Legislative Assembly", district_name: "Chestermere-Strathmore" },
    { slug: "justin-wright", fullName: "Justin Wright", office: "Member of Legislative Assembly", district_name: "Cypress-Medicine Hat" },
    { slug: "andrew-boitchenko", fullName: "Andrew Boitchenko", office: "Member of Legislative Assembly", district_name: "Drayton Valley-Devon" },
    { slug: "nate-horner", fullName: "Nate Horner", office: "Member of Legislative Assembly", district_name: "Drumheller-Stettler" },
    { slug: "peggy-wright", fullName: "Peggy Wright", office: "Member of Legislative Assembly", district_name: "Edmonton-Beverly-Clareview" },
    { slug: "nicole-goehring", fullName: "Nicole Goehring", office: "Member of Legislative Assembly", district_name: "Edmonton-Castle Downs" },
    { slug: "david-shepherd", fullName: "David Shepherd", office: "Member of Legislative Assembly", district_name: "Edmonton-City Centre" },
    { slug: "sharif-haji", fullName: "Sharif Haji", office: "Member of Legislative Assembly", district_name: "Edmonton-Decore" },
    { slug: "gurtej-brarmemberelect", fullName: "Gurtej Brar - Member-elect", office: "Member of Legislative Assembly", district_name: "Edmonton-Ellerslie" },
    { slug: "sarah-hoffman", fullName: "Sarah Hoffman", office: "Member of Legislative Assembly", district_name: "Edmonton-Glenora" },
    { slug: "marlin-schmidt", fullName: "Marlin Schmidt", office: "Member of Legislative Assembly", district_name: "Edmonton-Gold Bar" },
    { slug: "janis-irwin", fullName: "Janis Irwin", office: "Member of Legislative Assembly", district_name: "Edmonton-Highlands-Norwood" },
    { slug: "heather-sweet", fullName: "Heather Sweet", office: "Member of Legislative Assembly", district_name: "Edmonton-Manning" },
    { slug: "lorne-dach", fullName: "Lorne Dach", office: "Member of Legislative Assembly", district_name: "Edmonton-McClung" },
    { slug: "jasvir-deol", fullName: "Jasvir Deol", office: "Member of Legislative Assembly", district_name: "Edmonton-Meadows" },
    { slug: "christina-gray", fullName: "Christina Gray", office: "Member of Legislative Assembly", district_name: "Edmonton-Mill Woods" },
    { slug: "david-eggen", fullName: "David Eggen", office: "Member of Legislative Assembly", district_name: "Edmonton-North West" },
    { slug: "lori-sigurdson", fullName: "Lori Sigurdson", office: "Member of Legislative Assembly", district_name: "Edmonton-Riverview" },
    { slug: "jodi-calahoostonehouse", fullName: "Jodi Calahoo Stonehouse", office: "Member of Legislative Assembly", district_name: "Edmonton-Rutherford" },
    { slug: "rhiannon-hoyle", fullName: "Rhiannon Hoyle", office: "Member of Legislative Assembly", district_name: "Edmonton-South" },
    { slug: "nathan-ip", fullName: "Nathan Ip", office: "Member of Legislative Assembly", district_name: "Edmonton-South West" },
    { slug: "naheed-nenshimemberelect", fullName: "Naheed Nenshi - Member-elect", office: "Member of Legislative Assembly", district_name: "Edmonton-Strathcona" },
    { slug: "brooks-arcandpaul", fullName: "Brooks Arcand-Paul", office: "Member of Legislative Assembly", district_name: "Edmonton-West Henday" },
    { slug: "rakhi-pancholi", fullName: "Rakhi Pancholi", office: "Member of Legislative Assembly", district_name: "Edmonton-Whitemud" },
    { slug: "brian-jeankc", fullName: "Brian Jean, KC", office: "Member of Legislative Assembly", district_name: "Fort McMurray-Lac La Biche" },
    { slug: "tany-yao", fullName: "Tany Yao", office: "Member of Legislative Assembly", district_name: "Fort McMurray-Wood Buffalo" },
    { slug: "jackie-armstronghomeniuk", fullName: "Jackie Armstrong-Homeniuk", office: "Member of Legislative Assembly", district_name: "Fort Saskatchewan-Vegreville" },
    { slug: "nolan-dyck", fullName: "Nolan Dyck", office: "Member of Legislative Assembly", district_name: "Grande Prairie" },
    { slug: "ron-wiebe", fullName: "Ron Wiebe", office: "Member of Legislative Assembly", district_name: "Grande Prairie-Wapiti" },
    { slug: "rj-sigurdson", fullName: "R.J. Sigurdson", office: "Member of Legislative Assembly", district_name: "Highwood" },
    { slug: "devin-dreeshen", fullName: "Devin Dreeshen", office: "Member of Legislative Assembly", district_name: "Innisfail-Sylvan Lake" },
    { slug: "shane-getson", fullName: "Shane Getson", office: "Member of Legislative Assembly", district_name: "Lac Ste. Anne-Parkland" },
    { slug: "jennifer-johnson", fullName: "Jennifer Johnson", office: "Member of Legislative Assembly", district_name: "Lacombe-Ponoka" },
    { slug: "brandon-lunty", fullName: "Brandon Lunty", office: "Member of Legislative Assembly", district_name: "Leduc-Beaumont" },
    { slug: "scott-sinclair", fullName: "Scott Sinclair", office: "Member of Legislative Assembly", district_name: "Lesser Slave Lake" },
    { slug: "nathan-neudorf", fullName: "Nathan Neudorf", office: "Member of Legislative Assembly", district_name: "Lethbridge-East" },
    { slug: "rob-miyashiro", fullName: "Rob Miyashiro", office: "Member of Legislative Assembly", district_name: "Lethbridge-West" },
    { slug: "chelsae-petrovic", fullName: "Chelsae Petrovic", office: "Member of Legislative Assembly", district_name: "Livingstone-Macleod" },
    { slug: "rick-wilson", fullName: "Rick Wilson", office: "Member of Legislative Assembly", district_name: "Maskwacis-Wetaskiwin" },
    { slug: "dale-nally", fullName: "Dale Nally", office: "Member of Legislative Assembly", district_name: "Morinville-St. Albert" },
    { slug: "tara-sawyermemberelect", fullName: "Tara Sawyer - Member-elect", office: "Member of Legislative Assembly", district_name: "Olds-Didsbury-Three Hills" },
    { slug: "dan-williams", fullName: "Dan Williams", office: "Member of Legislative Assembly", district_name: "Peace River" },
    { slug: "adriana-lagrange", fullName: "Adriana LaGrange", office: "Member of Legislative Assembly", district_name: "Red Deer-North" },
    { slug: "jason-stephan", fullName: "Jason Stephan", office: "Member of Legislative Assembly", district_name: "Red Deer-South" },
    { slug: "jason-nixon", fullName: "Jason Nixon", office: "Member of Legislative Assembly", district_name: "Rimbey-Rocky Mountain House-Sundre" },
    { slug: "kyle-kasawski", fullName: "Kyle Kasawski", office: "Member of Legislative Assembly", district_name: "Sherwood Park" },
    { slug: "searle-turton", fullName: "Searle Turton", office: "Member of Legislative Assembly", district_name: "Spruce Grove-Stony Plain" },
    { slug: "marie-renaud", fullName: "Marie Renaud", office: "Member of Legislative Assembly", district_name: "St. Albert" },
    { slug: "nate-glubish", fullName: "Nate Glubish", office: "Member of Legislative Assembly", district_name: "Strathcona-Sherwood Park" },
    { slug: "grant-hunter", fullName: "Grant Hunter", office: "Member of Legislative Assembly", district_name: "Taber-Warner" },
    { slug: "garth-rowswell", fullName: "Garth Rowswell", office: "Member of Legislative Assembly", district_name: "Vermilion-Lloydminster-Wainwright" },
    { slug: "martin-long", fullName: "Martin Long", office: "Member of Legislative Assembly", district_name: "West Yellowhead" }
  ];
  
  console.log(`📋 Using embedded data: ${officials.length} officials`);
  
  const results = {
    totalOfficials: officials.length,
    processedOfficials: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalArticles: 0,
    startTime: new Date().toISOString(),
    progress: []
  };
  
  // Generate last 12 months (365 days)
  const dates = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  console.log(`📅 Processing ${dates.length} days (12 months)`);
  
  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];
    const progress = `${i + 1} of ${officials.length}`;
    
    console.log(`👤 [${progress}] Processing ${official.fullName} (${official.office})`);
    
    const officialResults = {
      official: official.fullName,
      office: official.office,
      queries: [],
      totalArticles: 0
    };
    
    // Process all 365 days (12 months) as requested
    const demoDates = dates;
    
                for (const date of demoDates) {
              try {
                const query = buildEnhancedQuery(official);
                
                // Make actual SERPHouse API call
                const serphouseResponse = await makeSerphouseCall(query, date);
                
                officialResults.queries.push({
                  date: date,
                  success: true,
                  articlesFound: serphouseResponse.count || 0,
                  query: query,
                  articles: serphouseResponse.articles || []
                });

                officialResults.totalArticles += serphouseResponse.count || 0;
                results.successfulQueries++;

              } catch (error) {
                officialResults.queries.push({
                  date: date,
                  success: false,
                  error: error.message
                });
                results.failedQueries++;
              }
            }
    
    results.totalArticles += officialResults.totalArticles;
    results.processedOfficials++;
    results.progress.push({
      official: official.fullName,
      progress: progress,
      articlesFound: officialResults.totalArticles,
      status: 'completed'
    });
    
    console.log(`✅ [${progress}] ${official.fullName}: ${officialResults.totalArticles} total articles`);
    
    // Add small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  results.endTime = new Date().toISOString();
  const duration = new Date(results.endTime) - new Date(results.startTime);
  const durationMinutes = Math.round(duration / 60000);
  
  console.log(`\n🎉 Full Backfill Complete!`);
  console.log(`⏰ Duration: ${durationMinutes} minutes`);
  console.log(`👥 Officials processed: ${results.processedOfficials}/${results.totalOfficials}`);
  console.log(`✅ Successful queries: ${results.successfulQueries}`);
  console.log(`❌ Failed queries: ${results.failedQueries}`);
  console.log(`📰 Total articles found: ${results.totalArticles}`);
  
  res.json({
    success: true,
    message: 'Full backfill completed successfully',
    results: results,
    timestamp: new Date().toISOString()
  });
}

// Enhanced query builder function (same as in the test)
function buildEnhancedQuery(person) {
  const separationKeywords = [
    "Alberta separation", "Alberta independence", "Alberta sovereignty",
    "Sovereignty Act", "referendum", "secede", "secession",
    "leave Canada", "break from Canada", "Alberta Prosperity Project",
    "Forever Canada", "Forever Canadian"
  ];

  const unityKeywords = [
    "remain in Canada", "stay in Canada", "support Canada",
    "oppose separation", "oppose independence", "pro-Canada stance",
    "keep Alberta in Canada"
  ];

  const allKeywords = [...separationKeywords, ...unityKeywords];

  let titleVariants;
  if (person.office.includes('Legislative Assembly') || person.office.includes('MLA')) {
    titleVariants = '"MLA" OR "Member of Legislative Assembly"';
  } else if (person.office.includes('Parliament') || person.office.includes('MP')) {
    titleVariants = '"MP" OR "Member of Parliament"';
  } else {
    titleVariants = '"MLA" OR "Member of Legislative Assembly" OR "MP" OR "Member of Parliament"';
  }

  return `"${person.fullName}" (${titleVariants}) AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
}

// Actual SERPHouse API call function
async function makeSerphouseCall(query, date) {
  const axios = require('axios');
  
  const apiToken = process.env.SERPHOUSE_API_TOKEN;
  if (!apiToken) {
    console.error('SERPHOUSE_API_TOKEN not found in environment variables');
    throw new Error('SERPHOUSE_API_TOKEN environment variable is required');
  }

  const url = 'https://api.serphouse.com/serp/live';
  const params = {
    api_token: apiToken,
    q: query,
    domain: 'google.ca',
    lang: 'en',
    device: 'desktop',
    serp_type: 'news',
    loc: 'Alberta,Canada',
    num: 50
  };

  try {
    console.log(`Making SERPHouse API call for query: ${query}`);
    const response = await axios.get(url, { params });
    console.log(`SERPHouse API response status: ${response.status}`);
    
    if (response.data && response.data.news) {
      console.log(`Found ${response.data.news.length} articles`);
      return {
        count: response.data.news.length,
        articles: response.data.news,
        status: response.status
      };
    } else {
      console.log('No news data in response');
      return {
        count: 0,
        articles: [],
        status: response.status
      };
    }
  } catch (error) {
    console.error('SERPHouse API error:', error.message);
    console.error('Error details:', error.response?.data);
    throw error;
  }
}



// Sentiment analysis endpoints
app.get('/api/sentiment/test', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    res.json({ 
      message: 'SentimentAnalyzer initialized successfully!',
      timestamp: new Date().toISOString(),
      status: 'ready'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'SentimentAnalyzer initialization failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/sentiment/analyze', async (req, res) => {
  try {
    const { articleText, politicianName } = req.body;
    
    if (!articleText || !politicianName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['articleText', 'politicianName'],
        received: { articleText: !!articleText, politicianName: !!politicianName }
      });
    }

    const analyzer = new SentimentAnalyzer();
    const result = await analyzer.analyzeArticle(articleText, politicianName);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sentiment analysis error:', error.message);
    res.status(500).json({
      error: 'Sentiment analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test all Danielle Smith articles
app.get('/api/sentiment/test-danielle-smith', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== Testing Sentiment Analysis with Danielle Smith Articles ===');
    
    // Load all 19 articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure storage`);
    
    if (articles.length === 0) {
      return res.json({
        success: false,
        message: 'No articles found for danielle-smith in Azure storage',
        timestamp: new Date().toISOString()
      });
    }
    
    // Process each article through sentiment analysis
    const results = [];
    let passedCount = 0;
    let failedCount = 0;
    let flaggedCount = 0;
    let totalScore = 0;
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`Processing Article ${i + 1}/${articles.length}: ${article.filename}`);
      
      try {
        // Debug: Log the actual structure of the first article
        if (i === 0) {
          console.log('DEBUG: First article structure:', JSON.stringify(article.content, null, 2));
        }
        
        // Extract full article content from SERPHouse JSON structure
        let articleText = '';
        if (article.content && article.content.raw && article.content.raw.length > 0) {
          // SERPHouse structure: get first result's title and snippet
          const firstResult = article.content.raw[0];
          articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
        } else if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
          // Alternative SERPHouse structure
          const firstResult = article.content.organic_results[0];
          articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
        } else if (article.content.title && article.content.snippet) {
          // Direct structure
          articleText = article.content.title + "\n" + article.content.snippet;
        } else if (article.content.snippet) {
          // Just snippet
          articleText = article.content.snippet;
        } else {
          // Fallback: try to extract any text content
          articleText = JSON.stringify(article.content).substring(0, 1000);
        }
        
        console.log(`DEBUG: Extracted article text for ${article.filename}: "${articleText.substring(0, 100)}..."`);
        const result = await analyzer.analyzeArticle(articleText, "Danielle Smith");
        results.push(result);
        
        if (result.agent1.passed) {
          passedCount++;
          if (result.final.score !== null) {
            totalScore += result.final.score;
          }
        }
        
        if (result.final.flaggedForReview) {
          flaggedCount++;
        }
        
        console.log(`Article ${i + 1} Result: Passed=${result.agent1.passed}, Score=${result.final.score}, Flagged=${result.final.flaggedForReview}`);
        
      } catch (error) {
        console.error(`Error processing article ${i + 1}:`, error.message);
        failedCount++;
        results.push({
          articleId: analyzer.generateArticleId(article.content.title + article.content.snippet),
          politician: "Danielle Smith",
          processedAt: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    const averageScore = passedCount > 0 ? (totalScore / passedCount) : null;
    const overallClassification = averageScore ? analyzer.getClassification(averageScore) : "N/A";
    
    const summary = {
      totalArticles: articles.length,
      passedRelevance: passedCount,
      failedProcessing: failedCount,
      flaggedForReview: flaggedCount,
      averageScore: averageScore ? averageScore.toFixed(2) : null,
      overallClassification: overallClassification
    };
    
    console.log('\n=== TEST SUMMARY FOR DANIELLE SMITH ===');
    console.log(`Total Articles Processed: ${summary.totalArticles}`);
    console.log(`Articles Passed Relevance Gate: ${summary.passedRelevance}`);
    console.log(`Articles Flagged for Review: ${summary.flaggedForReview}`);
    console.log(`Average Stance Score: ${summary.averageScore}`);
    console.log(`Overall Classification: ${summary.overallClassification}`);
    
    res.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to examine all article content
app.get('/api/sentiment/debug-articles', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== DEBUG: Examining All Danielle Smith Articles ===');
    
    // Load all 19 articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure storage`);
    
    if (articles.length === 0) {
      return res.json({
        success: false,
        message: 'No articles found for danielle-smith in Azure storage',
        timestamp: new Date().toISOString()
      });
    }
    
    // Examine each article's content structure
    const debugResults = [];
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n--- DEBUG Article ${i + 1}/${articles.length}: ${article.filename} ---`);
      
      // Extract content using same logic as test
      let articleText = '';
      if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
        const firstResult = article.content.organic_results[0];
        articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
      } else if (article.content.title && article.content.snippet) {
        articleText = article.content.title + "\n" + article.content.snippet;
      } else if (article.content.snippet) {
        articleText = article.content.snippet;
      } else {
        articleText = JSON.stringify(article.content).substring(0, 1000);
      }
      
      debugResults.push({
        articleNumber: i + 1,
        filename: article.filename,
        contentStructure: {
          hasOrganicResults: !!(article.content && article.content.organic_results),
          organicResultsCount: article.content?.organic_results?.length || 0,
          hasDirectTitle: !!article.content?.title,
          hasDirectSnippet: !!article.content?.snippet,
          contentKeys: Object.keys(article.content || {})
        },
        extractedText: articleText.substring(0, 500) + (articleText.length > 500 ? '...' : ''),
        extractedTextLength: articleText.length,
        fullContentSample: JSON.stringify(article.content, null, 2).substring(0, 1000) + '...'
      });
      
      console.log(`Content keys: ${Object.keys(article.content || {}).join(', ')}`);
      console.log(`Extracted text length: ${articleText.length}`);
      console.log(`Extracted text preview: "${articleText.substring(0, 200)}..."`);
    }
    
    res.json({
      success: true,
      totalArticles: articles.length,
      debugResults: debugResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Count all articles across all politicians
app.get('/api/sentiment/count-all-articles', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== Counting All Articles Across All Politicians ===');
    
    // Load the politician roster
    const roster = require('./data/ab-roster.json');
    console.log(`Found ${roster.length} politicians in roster`);
    
    const results = [];
    let totalArticles = 0;
    let politiciansWithArticles = 0;
    let politiciansWithEmptyResults = 0;
    
    for (let i = 0; i < roster.length; i++) {
      const politician = roster[i];
      const politicianSlug = politician.slug;
      
      try {
        console.log(`Checking ${i + 1}/${roster.length}: ${politician.name} (${politicianSlug})`);
        
        // Load articles for this politician
        const articles = await analyzer.readArticlesFromStorage(politicianSlug, 100); // Get up to 100 articles
        
        const articleCount = articles.length;
        totalArticles += articleCount;
        
        if (articleCount > 0) {
          politiciansWithArticles++;
          
          // Check how many have actual content vs empty results
          let articlesWithContent = 0;
          let articlesWithEmptyRaw = 0;
          
          for (const article of articles) {
            if (article.content && article.content.raw && article.content.raw.length > 0) {
              articlesWithContent++;
            } else {
              articlesWithEmptyRaw++;
            }
          }
          
          results.push({
            politician: politician.name,
            slug: politicianSlug,
            totalArticles: articleCount,
            articlesWithContent: articlesWithContent,
            articlesWithEmptyRaw: articlesWithEmptyRaw,
            contentPercentage: articleCount > 0 ? ((articlesWithContent / articleCount) * 100).toFixed(1) : 0
          });
        } else {
          politiciansWithEmptyResults++;
          results.push({
            politician: politician.name,
            slug: politicianSlug,
            totalArticles: 0,
            articlesWithContent: 0,
            articlesWithEmptyRaw: 0,
            contentPercentage: 0
          });
        }
        
        console.log(`  ${politician.name}: ${articleCount} articles`);
        
      } catch (error) {
        console.error(`Error checking ${politician.name}:`, error.message);
        results.push({
          politician: politician.name,
          slug: politicianSlug,
          error: error.message,
          totalArticles: 0
        });
      }
    }
    
    const summary = {
      totalPoliticians: roster.length,
      totalArticles: totalArticles,
      politiciansWithArticles: politiciansWithArticles,
      politiciansWithEmptyResults: politiciansWithEmptyResults,
      averageArticlesPerPolitician: roster.length > 0 ? (totalArticles / roster.length).toFixed(1) : 0
    };
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Politicians: ${summary.totalPoliticians}`);
    console.log(`Total Articles: ${summary.totalArticles}`);
    console.log(`Politicians with Articles: ${summary.politiciansWithArticles}`);
    console.log(`Politicians with Empty Results: ${summary.politiciansWithEmptyResults}`);
    console.log(`Average Articles per Politician: ${summary.averageArticlesPerPolitician}`);
    
    res.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Count failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Count failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed article table for all 121 politicians
app.get('/api/sentiment/article-table', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    const roster = require('./data/ab-roster.json');
    
    console.log('📊 Generating detailed article table for all 121 politicians...');
    
    let allArticles = [];
    let totalProcessed = 0;
    
    for (const politician of roster) {
      try {
        console.log(`Processing ${politician.name} (${totalProcessed + 1}/121)...`);
        
        // Read articles for this politician
        const articles = await analyzer.readArticlesFromStorage(politician.slug, 100); // Get up to 100 articles
        
        for (const article of articles) {
          // Extract content from the article
          let sourceUrl = '';
          let title = '';
          let snippet = '';
          let date = '';
          
          if (article.content && article.content.raw && article.content.raw.length > 0) {
            const firstResult = article.content.raw[0];
            title = firstResult.title || '';
            snippet = firstResult.snippet || '';
            sourceUrl = firstResult.link || '';
            date = firstResult.date || '';
          } else if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
            const firstResult = article.content.organic_results[0];
            title = firstResult.title || '';
            snippet = firstResult.snippet || '';
            sourceUrl = firstResult.link || '';
            date = firstResult.date || '';
          } else if (article.content.title && article.content.snippet) {
            title = article.content.title;
            snippet = article.content.snippet;
            sourceUrl = article.content.link || '';
            date = article.content.date || '';
          } else if (article.content.snippet) {
            snippet = article.content.snippet;
            sourceUrl = article.content.link || '';
            date = article.content.date || '';
          }
          
          // Only include articles that have actual content
          if (title || snippet) {
            allArticles.push({
              date: date,
              source: sourceUrl,
              politician: politician.name,
              title: title,
              snippet: snippet,
              filename: article.filename
            });
          }
        }
        
        totalProcessed++;
      } catch (error) {
        console.error(`Error processing ${politician.name}:`, error.message);
        totalProcessed++;
      }
    }
    
    console.log(`✅ Processed all ${totalProcessed} politicians. Found ${allArticles.length} articles with content.`);
    
    res.json({
      success: true,
      summary: {
        totalPoliticians: roster.length,
        totalArticles: allArticles.length,
        politiciansProcessed: totalProcessed
      },
      articles: allArticles,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating article table:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for debugging
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test', '/api/sentiment/analyze', '/api/sentiment/test-danielle-smith', '/api/sentiment/debug-articles', '/api/sentiment/count-all-articles', '/api/sentiment/article-table', '/api/whoami']
  });
});

module.exports = app;
