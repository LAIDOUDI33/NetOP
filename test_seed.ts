import { db } from './src/lib/db';
async function main() {
  console.log('TEST: starting');
  const sites = await db.networkSite.findMany();
  console.log('TEST: sites count = ' + sites.length);
  await db.$disconnect();
  console.log('TEST: done');
}
main();
