import { db } from '../server/db';
import { agentFunctionSettings } from '@shared/schema';
import { eq, isNotNull } from 'drizzle-orm';

/**
 * Migration script to convert single selectedIntegrationId to array selectedIntegrationIds
 * Run this AFTER deploying the schema changes but BEFORE deprecating the old field
 *
 * Usage: npm run migrate:integration-ids
 */
async function migrateIntegrationIds() {
  console.log('Starting migration of integration IDs...');

  try {
    // Find all settings with a non-null selectedIntegrationId
    const settings = await db.select()
      .from(agentFunctionSettings)
      .where(isNotNull(agentFunctionSettings.selectedIntegrationId));

    console.log(`Found ${settings.length} records with selectedIntegrationId set`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const setting of settings) {
      // Skip if already has data in new field
      const existingIds = setting.selectedIntegrationIds as any;
      if (existingIds && Array.isArray(existingIds) && existingIds.length > 0) {
        console.log(`  Skipping ${setting.id} - already has selectedIntegrationIds`);
        skippedCount++;
        continue;
      }

      // Convert single ID to array
      const newIds = setting.selectedIntegrationId ? [setting.selectedIntegrationId] : [];

      console.log(`  Migrating ${setting.id}: "${setting.selectedIntegrationId}" -> [${newIds.join(', ')}]`);

      await db.update(agentFunctionSettings)
        .set({
          selectedIntegrationIds: newIds as any,
          updatedAt: new Date()
        })
        .where(eq(agentFunctionSettings.id, setting.id));

      migratedCount++;

      if (migratedCount % 10 === 0) {
        console.log(`  ... migrated ${migratedCount} records so far`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`  - Migrated: ${migratedCount}`);
    console.log(`  - Skipped (already migrated): ${skippedCount}`);
    console.log(`  - Total processed: ${settings.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateIntegrationIds()
  .then(() => {
    console.log('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
