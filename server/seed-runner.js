import { seedDatabase } from './seed.js';

console.log('Seeding Aswanu database with synthetic demonstration records...');
const result = seedDatabase();
console.log(result.message);
