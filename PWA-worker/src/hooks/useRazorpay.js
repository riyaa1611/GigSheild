import { callFunction, supabase } from "../lib/supabase";

function loadScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpay() {
  async function payPremium({ amount, planType, policyId, userName, userPhone, session, onSuccess, onFailure, onStatusChange }) {
    const loaded = await loadScript();
    if (!loaded) {
      onFailure?.("Razorpay SDK failed to load");
      return;
    }

    let orderData;
    try {
      orderData = await callFunction("razorpay-order", { amount, purpose: "premium", planType, policyId }, session);
    } catch (e) {
      onFailure?.(e.message);
      return;
    }

    onStatusChange?.("order_created", { orderId: orderData.orderId, amount: orderData.amount });

    const orderChannel = supabase
      .channel(`razorpay-order:${orderData.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "razorpay_orders",
          filter: `razorpay_order_id=eq.${orderData.orderId}`
        },
        (payload) => {
          const nextStatus = payload.new?.status || "updated";
          onStatusChange?.(nextStatus, payload.new);
          if (nextStatus === "paid") {
            onStatusChange?.("verified", payload.new);
          }
        }
      )
      .subscribe();

    const cleanup = () => {
      supabase.removeChannel(orderChannel);
    };

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "GigShield",
      description: `${planType?.charAt(0).toUpperCase()}${planType?.slice(1)}Shield Weekly Premium`,
      order_id: orderData.orderId,
      prefill: {
        name: userName || "Worker",
        contact: userPhone ? `+91${userPhone}` : ""
      },
      theme: { color: "#4ade80" },
      modal: { backdropclose: false },
      handler: async (response) => {
        try {
          onStatusChange?.("verifying", response);
          const verified = await callFunction("razorpay-verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }, session);
          cleanup();
          onStatusChange?.("verified", verified);
          onSuccess?.(verified);
        } catch (e) {
          cleanup();
          onFailure?.(e.message);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp) => {
      cleanup();
      onStatusChange?.("failed", resp);
      onFailure?.(resp.error?.description || "Payment failed");
    });
    rzp.on("modal.closed", () => {
      onStatusChange?.("closed");
    });
    rzp.open();
  }

  return { payPremium };
}