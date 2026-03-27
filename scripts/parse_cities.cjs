const fs = require('fs');

const csv = fs.readFileSync('./attached_assets/都市名インプット_1766592185254.csv', 'utf-8');
const lines = csv.split('\n');

const cities = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith(',,,')) continue;
  
  const cols = line.split(',');
  if (cols.length < 11) continue;
  
  const cityJp = cols[3];
  const cityEn = cols[4];
  const countryJp = cols[1];
  const displayJp = cols[9];
  const aliases = cols[10] || '';
  
  if (!cityJp || !displayJp) continue;
  
  cities.push({
    cityJp,
    cityEn,
    countryJp,
    displayJp,
    aliases
  });
}

let output = `export interface CityData {
  cityJp: string;
  cityEn: string;
  countryJp: string;
  displayJp: string;
  aliases: string;
}

export const CITIES_MASTER: CityData[] = [
`;

cities.forEach((c, i) => {
  const comma = i < cities.length - 1 ? ',' : '';
  output += `  { cityJp: ${JSON.stringify(c.cityJp)}, cityEn: ${JSON.stringify(c.cityEn)}, countryJp: ${JSON.stringify(c.countryJp)}, displayJp: ${JSON.stringify(c.displayJp)}, aliases: ${JSON.stringify(c.aliases)} }${comma}\n`;
});

output += '];\n';

fs.mkdirSync('./client/src/data', { recursive: true });
fs.writeFileSync('./client/src/data/cities.ts', output);
console.log(`Generated ${cities.length} cities`);
