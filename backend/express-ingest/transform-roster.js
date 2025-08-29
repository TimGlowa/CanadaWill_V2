const fs = require('fs');
const path = require('path');

// Read the current roster
const rosterPath = path.join(__dirname, 'data/ab-roster.json');
const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));

// Transform to orchestrator format
const transformedRoster = roster.map(person => {
  const firstName = person.first_name.toLowerCase().replace(/[^a-z]/g, '');
  const lastName = person.last_name.toLowerCase().replace(/[^a-z]/g, '');
  const slug = `${firstName}-${lastName}`;
  
  return {
    slug: slug,
    fullName: `${person.first_name} ${person.last_name}`,
    office: person.role,
    riding: person.town || null,
    aliases: [
      person.first_name,
      person.last_name,
      `${person.first_name} ${person.last_name}`,
      slug
    ],
    city: person.town || null
  };
});

// Write transformed roster
const transformedPath = path.join(__dirname, 'data/ab-roster-transformed.json');
fs.writeFileSync(transformedPath, JSON.stringify(transformedRoster, null, 2));

console.log(`Transformed ${transformedRoster.length} representatives`);
console.log(`Sample entry:`, transformedRoster[0]);
console.log(`Output: ${transformedPath}`); 