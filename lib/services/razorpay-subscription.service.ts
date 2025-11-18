import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class RazorpaySubscriptionService {
  
  /**
   * Create a subscription plan for sponsorship
   */
  static async createPlan(amount: number, categoryName: string) {
    try {
      const plan = await razorpay.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: `Sponsorship - ${categoryName}`,
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          description: `Monthly sponsorship for ${categoryName} category`
        },
        notes: {
          category: categoryName,
          type: 'sponsorship'
        }
      });
      
      return {
        success: true,
        planId: plan.id,
        plan
      };
    } catch (error) {
      console.error('Error creating Razorpay plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create plan'
      };
    }
  }

  /**
   * Create a customer for the sponsor
   */
  static async createCustomer(sponsorData: {
    name: string;
    email: string;
    phone?: string;
  }) {
    try {
      const customer = await razorpay.customers.create({
        name: sponsorData.name,
        email: sponsorData.email,
        contact: sponsorData.phone,
        notes: {
          type: 'sponsor'
        }
      });
      
      return {
        success: true,
        customerId: customer.id,
        customer
      };
    } catch (error) {
      console.error('Error creating Razorpay customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer'
      };
    }
  }

  /**
   * Create a subscription for the sponsor
   */
  static async createSubscription(data: {
    planId: string;
    customerId?: string;
    totalCount?: number;
    startAt?: number;
    notes?: Record<string, string>;
  }) {
    try {
      const subscriptionData: any = {
        plan_id: data.planId,
        total_count: data.totalCount || 12, // Default 12 months
        quantity: 1,
        notes: {
          type: 'sponsorship',
          ...data.notes
        }
      };

      if (data.customerId) {
        subscriptionData.customer_id = data.customerId;
      }

      if (data.startAt) {
        subscriptionData.start_at = data.startAt;
      }

      const subscription = await razorpay.subscriptions.create(subscriptionData);
      
      return {
        success: true,
        subscriptionId: subscription.id,
        subscription
      };
    } catch (error) {
      console.error('Error creating Razorpay subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription'
      };
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false) {
    try {
      const subscription = await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Pause a subscription
   */
  static async pauseSubscription(subscriptionId: string) {
    try {
      const subscription = await razorpay.subscriptions.pause(subscriptionId);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause subscription'
      };
    }
  }

  /**
   * Resume a subscription
   */
  static async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await razorpay.subscriptions.resume(subscriptionId);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume subscription'
      };
    }
  }

  /**
   * Get all payments for a subscription
   */
  static async getSubscriptionPayments(subscriptionId: string) {
    try {
      // Get subscription details first
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      
      // Get all payments and filter by subscription
      const allPayments = await razorpay.payments.all({
        count: 100 // Adjust as needed
      });
      
      // Filter payments for this subscription (if needed)
      const subscriptionPayments = allPayments.items || [];
      
      return {
        success: true,
        payments: subscriptionPayments,
        subscription
      };
    } catch (error) {
      console.error('Error fetching subscription payments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payments'
      };
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}