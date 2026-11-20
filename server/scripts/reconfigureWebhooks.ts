#!/usr/bin/env node

/**
 * Script to reconfigure existing phone number with correct webhook URLs
 */

import { phoneNumberPurchaser } from '../utils/phoneNumberPurchaser';
import { twilioService } from '../services/twilioService';

async function main() {
  try {
    console.log('🔄 Reconfiguring webhooks for existing phone numbers...\n');

    // Get existing phone numbers
    const existingNumbers = await phoneNumberPurchaser.listExistingNumbers();

    if (existingNumbers.length === 0) {
      console.log('❌ No existing phone numbers found.');
      process.exit(1);
    }

    console.log('\n📞 Reconfiguring all existing numbers with correct webhook URLs...');

    for (const number of existingNumbers) {
      console.log(`\n🔧 Processing: ${number.phoneNumber} (SID: ${number.sid})`);
      
      try {
        const configuredNumber = await phoneNumberPurchaser.configureExistingNumber(
          number.sid,
          number.phoneNumber
        );
        
        console.log('✅ Successfully configured!');
        console.log(`   Voice URL: ${configuredNumber.voiceUrl}`);
        console.log(`   SMS URL: ${configuredNumber.smsUrl}`);
        
        // Set as the current phone number for the service
        twilioService.setPhoneNumber(number.phoneNumber);
        process.env.TWILIO_PHONE_NUMBER = number.phoneNumber;
        
        console.log(`📱 Set ${number.phoneNumber} as active AI receptionist number`);
        
      } catch (error) {
        console.error(`❌ Failed to configure ${number.phoneNumber}:`, error);
      }
    }

    console.log('\n🎉 Webhook reconfiguration completed!');
    console.log('\n📋 Your AI receptionist is now ready to receive calls:');
    
    // List final configuration
    const updatedNumbers = await phoneNumberPurchaser.listExistingNumbers();
    updatedNumbers.forEach(number => {
      if (number.voiceUrl && number.voiceUrl.includes('picard.replit.dev')) {
        console.log(`✅ ${number.phoneNumber} - Voice: ${number.voiceUrl}`);
      }
    });

  } catch (error) {
    console.error('\n❌ Failed to reconfigure webhooks:', error);
    process.exit(1);
  }
}

// Run the script
main();