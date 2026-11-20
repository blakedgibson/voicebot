/**
 * Retell AI Custom Function Webhooks
 *
 * These endpoints handle custom function calls from Retell AI agents during live conversations.
 * Each endpoint receives function parameters, processes the request, and returns a response to Retell.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { twilioService } from '../services/twilioService';
import { storage } from '../storage';
import { db } from '../db';
import { phoneNumberAssignments, voiceAgents, businessSettings, restaurantData, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * SMS Confirmation Webhook
 * Handles all SMS confirmation requests (orders, reservations, appointments, etc.)
 *
 * Function names: send_sms, sms_order_confirmation, sms_reservation_confirmation, etc.
 */
router.post('/api/retell/send_sms', async (req: Request, res: Response) => {
  try {
    const functionName = 'send_sms';

    const { customer_phone, message_content, agent_id } = req.body;

    // Validate required parameters
    if (!customer_phone || !message_content || !agent_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: customer_phone, message_content, agent_id'
      });
    }

    console.log(`📱 SMS webhook called: ${functionName}`);
    console.log(`   Agent ID: ${agent_id}`);
    console.log(`   Customer: ${customer_phone}`);
    console.log(`   Message: ${message_content.substring(0, 50)}...`);

    // Look up the agent's associated Twilio phone number
    const agent = await db.query.voiceAgents.findFirst({
      where: eq(voiceAgents.id, agent_id)
    });

    if (!agent) {
      console.error(`❌ Agent not found: ${agent_id}`);
      return res.status(404).json({
        success: false,
        message: 'Voice agent not found'
      });
    }

    // Get the Twilio phone number for this agent
    const phoneAssignment = await db.query.phoneNumberAssignments.findFirst({
      where: eq(phoneNumberAssignments.userId, agent.userId)
    });

    if (!phoneAssignment || !phoneAssignment.phoneNumber) {
      console.error(`❌ No Twilio phone number assigned to agent ${agent_id}`);
      return res.status(404).json({
        success: false,
        message: 'No Twilio phone number configured for this agent'
      });
    }

    // Send SMS using the AI receptionist phone number as the sender
    const smsResult = await twilioService.sendSMS(customer_phone, message_content, phoneAssignment.phoneNumber);

    console.log(`✅ SMS sent successfully from ${phoneAssignment.phoneNumber} to ${customer_phone}`);
    console.log(`   Message SID: ${smsResult.sid}`);

    // Return success response to Retell
    return res.json({
      success: true,
      message: 'SMS confirmation sent successfully',
      sms_sid: smsResult.sid
    });

  } catch (error) {
    console.error('❌ Error in SMS webhook:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send SMS'
    });
  }
});

/**
 * Transfer Call Webhook
 * Handles call transfer requests from Retell AI agents
 */
router.post('/api/retell/transfer_call', async (req: Request, res: Response) => {
  try {
    // Extract data from Retell AI webhook structure
    const { args, call } = req.body;
    
    // Get custom function arguments
    const reason = args?.reason || 'Customer requested transfer';
    const transferTarget = args?.transfer_target; // Specific person/role to transfer to
    
    // Get call metadata
    const retellCallId = call?.call_id;
    const agentId = call?.agent_id;
    const fromNumber = call?.from_number;
    const toNumber = call?.to_number;
    
    // Get Twilio Call SID from metadata (passed during call registration)
    const twilioCallSid = call?.metadata?.twilio_call_sid;

    console.log(`📞 Transfer call webhook triggered`);
    console.log(`   Retell Call ID: ${retellCallId}`);
    console.log(`   Twilio Call SID: ${twilioCallSid}`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Transfer Target: ${transferTarget || 'default'}`);
    console.log(`   From: ${fromNumber} → To: ${toNumber}`);

    if (!twilioCallSid) {
      console.error(`❌ No Twilio Call SID found in metadata`);
      return res.status(400).json({
        success: false,
        message: 'Twilio Call SID not available in call metadata'
      });
    }

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID not provided in request'
      });
    }

    // Look up agent by Retell agent ID
    const agent = await db.query.voiceAgents.findFirst({
      where: eq(voiceAgents.retellAgentId, agentId)
    });

    if (!agent) {
      console.error(`❌ Agent not found with Retell ID: ${agentId}`);
      return res.status(404).json({
        success: false,
        message: 'Voice agent not found'
      });
    }

    console.log(`✅ Found agent: ${agent.name} (DB ID: ${agent.id})`);

    // Get user record for transfer phone number and settings
    const user = await db.query.users.findFirst({
      where: eq(users.id, agent.userId)
    });

    if (!user) {
      console.error(`❌ User not found: ${agent.userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if transfer is enabled
    if (!user.enableCallTransfer) {
      console.warn(`⚠️ Transfer disabled for user ${agent.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Call transfer is currently disabled'
      });
    }

    if (!user.phoneNumber) {
      console.error(`❌ No transfer phone number configured for user ${agent.userId}`);
      return res.status(404).json({
        success: false,
        message: 'No transfer phone number configured. Please add your phone number in Account settings.'
      });
    }

    const transferNumber = user.phoneNumber;
    console.log(`📱 Transfer number: ${transferNumber}`);

    // Transfer the call using Twilio API with agentId for AI reconnect fallback
    console.log(`🔄 Initiating Twilio call transfer...`);
    const transferResult = await twilioService.transferCall(twilioCallSid, transferNumber, agentId);

    console.log(`✅ Call transferred successfully to ${transferNumber}`);
    console.log(`   Twilio Call Status: ${transferResult.status}`);

    // Mark the call as transferred in the database so status callback handler can identify it
    try {
      const { storage } = await import('../storage');
      const callLog = await storage.getTelephonyCallLogByTwilioSid(twilioCallSid);
      if (callLog) {
        const convData = (callLog.conversationData || {}) as any;
        await storage.updateTelephonyCallLog(callLog.id, {
          conversationData: {
            ...convData,
            transferred: true,
            transferredAt: new Date().toISOString(),
            transferReason: reason,
            transferTarget: transferNumber
          }
        });
        console.log(`📝 Marked call ${twilioCallSid} as transferred in database`);
      }
    } catch (dbError) {
      console.error('❌ Error marking call as transferred in database:', dbError);
      // Don't fail the transfer if database update fails
    }

    return res.json({
      success: true,
      message: `Transferring call to ${transferNumber}`,
      transfer_number: transferNumber,
      reason: reason,
      twilio_call_sid: twilioCallSid,
      call_status: transferResult.status
    });

  } catch (error) {
    console.error('❌ Error in transfer call webhook:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to transfer call'
    });
  }
});

/**
 * Get Business Info Webhook
 * Retrieves business information when knowledge base is unavailable
 * Used as fallback for business details during conversations
 */
router.post('/api/retell/get_business_info', async (req: Request, res: Response) => {
  try {
    const { query_type, specific_query } = req.body;

    console.log(`ℹ️ Get business info webhook triggered`);
    console.log(`   Query type: ${query_type}`);
    console.log(`   Specific query: ${specific_query}`);

    // Get agent ID from Retell webhook context
    const agent_id = req.headers['x-retell-agent-id'] as string;

    if (!agent_id) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID not provided in request'
      });
    }

    // Look up agent
    const agent = await db.query.voiceAgents.findFirst({
      where: eq(voiceAgents.id, agent_id)
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Voice agent not found'
      });
    }

    // Get business data (restaurantData/business information)
    const businessData = await db.query.restaurantData.findFirst({
      where: eq(restaurantData.userId, agent.userId)
    });

    if (!businessData) {
      return res.status(404).json({
        success: false,
        message: 'No business information found'
      });
    }

    // Format response based on query_type
    let responseData: any = {};

    switch (query_type) {
      case 'menu':
        responseData = {
          menu_items: businessData.menuItems || [],
          menu_description: businessData.menu || 'Menu not available'
        };
        break;

      case 'hours':
        responseData = {
          business_hours: businessData.hours || 'Hours not available',
          timezone: businessData.timezone || 'America/New_York'
        };
        break;

      case 'policies':
        responseData = {
          policies: businessData.policies || 'No policies specified'
        };
        break;

      case 'services':
        responseData = {
          services: businessData.services || [],
          description: businessData.description || ''
        };
        break;

      case 'location':
        responseData = {
          address: businessData.address || 'Address not available',
          city: businessData.city,
          state: businessData.state,
          zip_code: businessData.zipCode
        };
        break;

      case 'contact':
        responseData = {
          phone: businessData.phone || 'Phone not available',
          website: businessData.website,
          email: businessData.email
        };
        break;

      case 'faq':
        responseData = {
          faq: businessData.faq || [],
          common_questions: businessData.commonQuestions || []
        };
        break;

      case 'all':
      default:
        // Return all available business information
        responseData = {
          name: businessData.businessName,
          description: businessData.description,
          phone: businessData.phone,
          address: businessData.address,
          hours: businessData.hours,
          menu: businessData.menu,
          services: businessData.services,
          policies: businessData.policies
        };
        break;
    }

    console.log(`✅ Business info retrieved for query type: ${query_type}`);

    return res.json({
      success: true,
      query_type,
      data: responseData,
      message: `Business information retrieved successfully`
    });

  } catch (error) {
    console.error('❌ Error in get business info webhook:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve business information'
    });
  }
});

/**
 * Magic Browser Automation Webhook
 * Triggered by Retell AI custom function call during live conversations.
 * Looks up the caller's Magic integration and executes the browser automation booking.
 */
router.post('/api/retell/trigger_magic_action', async (req: Request, res: Response) => {
  try {
    console.log('🪄 trigger_magic_action called');
    const { args, call } = req.body;

    const toNumber = call?.to_number || args?.to_number;
    let agentId: string | null = null;
    let userId: string | null = null;

    if (toNumber) {
      const phoneAssignment = await storage.getPhoneNumberAssignmentByNumber(toNumber);
      if (phoneAssignment) {
        userId = phoneAssignment.userId;
        agentId = phoneAssignment.voiceAgentId;
      }
    }
    if (!agentId && call?.agent_id) {
      const agent = await storage.getVoiceAgentByRetellId(call.agent_id);
      if (agent) {
        agentId = agent.id;
        userId = agent.userId;
      }
    }

    if (!agentId || !userId) {
      return res.json({
        result: 'Magic browser automation is not configured. Unable to complete booking.',
      });
    }

    const integrations = await storage.getAgentIntegrations(agentId);
    const magic = (integrations as any[]).find((i: any) => i.type === 'newo_magic' && i.status !== 'paused');
    if (!magic) {
      return res.json({ result: 'No Magic automation integration found for this agent.' });
    }

    const { magicBrowserService } = await import('../services/magicBrowserService');
    const payload = {
      clientName: args?.client_name || args?.clientName || args?.customer_name || call?.metadata?.callerName,
      serviceType: args?.service_type || args?.serviceType || args?.service,
      date: args?.date || args?.appointment_date,
      time: args?.time || args?.appointment_time,
      phone: args?.phone || args?.customer_phone || call?.from_number,
      email: args?.email || args?.customer_email,
      notes: args?.notes || args?.special_requests,
    };

    const result = await magicBrowserService.executeAction(String(magic.id), payload);

    return res.json({ result: result.message, success: result.success, confirmationId: result.confirmationId });
  } catch (error: any) {
    console.error('🪄 trigger_magic_action error:', error);
    return res.json({ result: 'I encountered an issue completing the booking. Our team will follow up to confirm.' });
  }
});

export default router;
