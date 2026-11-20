#!/usr/bin/env node

/**
 * Script to purchase a phone number for the AI receptionist
 * Usage: tsx server/scripts/purchasePhoneNumber.ts [areaCode]
 */

import { phoneNumberPurchaser } from '../utils/phoneNumberPurchaser';

async function main() {
  try {
    console.log('🚀 Starting phone number purchase process...\n');

    // Check for existing phone numbers first
    console.log('1️⃣ Checking for existing phone numbers...');
    const existingNumbers = await phoneNumberPurchaser.listExistingNumbers();

    if (existingNumbers.length > 0) {
      console.log('\n❓ You already have phone numbers. Options:');
      console.log('   A. Configure an existing number for AI receptionist');
      console.log('   B. Purchase a new number\n');
      
      // For now, let's configure the first existing number
      const firstNumber = existingNumbers[0];
      console.log(`🔧 Configuring existing number: ${firstNumber.phoneNumber}`);
      
      const configuredNumber = await phoneNumberPurchaser.configureExistingNumber(
        firstNumber.sid,
        firstNumber.phoneNumber
      );
      
      console.log('\n✅ Setup completed! Your AI receptionist is ready.');
      console.log(`📞 Phone number: ${configuredNumber.phoneNumber}`);
      console.log(`🔗 Voice URL: ${configuredNumber.voiceUrl}`);
      console.log(`💬 SMS URL: ${configuredNumber.smsUrl}`);
      
    } else {
      console.log('\n2️⃣ No existing numbers found. Purchasing new number...');
      
      // Get area code from command line argument
      const areaCode = process.argv[2];
      const purchaseOptions = areaCode ? { areaCode, limit: 10 } : { limit: 10 };

      const purchasedNumber = await phoneNumberPurchaser.searchAndPurchaseNumber(purchaseOptions);
      
      console.log('\n✅ Setup completed! Your AI receptionist is ready.');
      console.log(`📞 Phone number: ${purchasedNumber.phoneNumber}`);
      console.log(`🔗 Voice URL: ${purchasedNumber.voiceUrl}`);
      console.log(`💬 SMS URL: ${purchasedNumber.smsUrl}`);
    }

  } catch (error) {
    console.error('\n❌ Failed to setup phone number:', error);
    process.exit(1);
  }
}

// Run the script
main();