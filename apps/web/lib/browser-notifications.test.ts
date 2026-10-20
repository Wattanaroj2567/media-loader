import assert from "node:assert/strict";
import test from "node:test";

import {
  areBrowserNotificationsEnabled,
  getNotificationPermission,
  registerBrowserPushSubscription,
  setBrowserNotificationsPreference,
} from "./browser-notifications.ts";

test("browser notifications are unavailable during server rendering", () => {
  assert.equal(getNotificationPermission(), "unsupported");
  assert.equal(areBrowserNotificationsEnabled("account-a"), false);
});

test("notification preference remains usable when local storage is unavailable", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalNotification = Object.getOwnPropertyDescriptor(
    globalThis,
    "Notification"
  );

  class GrantedNotification {
    static permission: NotificationPermission = "granted";
  }
  class MockPushManager {}

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      Notification: GrantedNotification,
      PushManager: MockPushManager,
      localStorage: {
        getItem() {
          throw new Error("Storage is unavailable");
        },
        setItem() {
          throw new Error("Storage is unavailable");
        },
      },
    },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: GrantedNotification,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker: {} },
  });

  try {
    setBrowserNotificationsPreference(true, "account-a");
    assert.equal(areBrowserNotificationsEnabled("account-a"), true);
    assert.equal(areBrowserNotificationsEnabled("account-b"), false);

    setBrowserNotificationsPreference(false, "account-a");
    assert.equal(areBrowserNotificationsEnabled("account-a"), false);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (originalNotification) {
      Object.defineProperty(globalThis, "Notification", originalNotification);
    } else {
      Reflect.deleteProperty(globalThis, "Notification");
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }
});

test("push registration replaces a subscription created with a different VAPID key", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const requestedKey = Uint8Array.from({ length: 65 }, (_, index) => index + 1);
  const oldKey = Uint8Array.from({ length: 65 }, (_, index) => index + 2);
  let unsubscribed = false;
  let subscribedWith: Uint8Array | null = null;

  const oldSubscription = {
    options: { applicationServerKey: oldKey.buffer },
    unsubscribe: async () => {
      unsubscribed = true;
      return true;
    },
  } as unknown as PushSubscription;
  const newSubscription = {} as PushSubscription;
  const registration = {
    pushManager: {
      getSubscription: async () => oldSubscription,
      subscribe: async (options: PushSubscriptionOptionsInit) => {
        subscribedWith = new Uint8Array(options.applicationServerKey as ArrayBuffer);
        return newSubscription;
      },
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker: { register: async () => registration } },
  });

  try {
    const encodedKey = Buffer.from(requestedKey).toString("base64url");
    const subscription = await registerBrowserPushSubscription(encodedKey);

    assert.equal(subscription, newSubscription);
    assert.equal(unsubscribed, true);
    assert.deepEqual(subscribedWith, requestedKey);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }
});
