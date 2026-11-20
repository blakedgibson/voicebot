import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { NotificationService } from '../services/notificationService';
import { storage } from '../storage';

const router = Router();

// Get all notifications
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const notifications = await NotificationService.getAllNotifications(userId);
    res.json({ notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get unread count
router.get('/unread-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/notifications/send-test-email — sends a test email alert to the user
router.post('/send-test-email', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await NotificationService.sendTestEmail(userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Failed to send test email' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark notifications as seen
router.post('/mark-seen', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    await NotificationService.markAsSeen(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notifications as seen:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/notifications/email-settings — returns notification preference columns
router.get('/email-settings', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      notifyEmailAlerts: user.notifyEmailAlerts ?? false,
      notifyDesktopAlerts: user.notifyDesktopAlerts ?? true,
      notifyCallFlagged: user.notifyCallFlagged ?? true,
    });
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/notifications/email-settings — saves notification preference columns
router.put('/email-settings', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { notifyEmailAlerts, notifyDesktopAlerts, notifyCallFlagged } = req.body;
    await storage.updateEmailNotifSettings(
      userId,
      Boolean(notifyEmailAlerts),
      notifyDesktopAlerts === undefined ? true : Boolean(notifyDesktopAlerts),
      notifyCallFlagged === undefined ? true : Boolean(notifyCallFlagged),
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
