package com.blockall;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.app.ActivityManager;
import android.os.Process;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.Timer;
import java.util.TimerTask;

public class AppBlockerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private DevicePolicyManager devicePolicyManager;
    private ComponentName deviceAdminComponent;
    private Timer blockingTimer;
    private String allowedPackage;
    private boolean isBlocking = false;

    public AppBlockerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.devicePolicyManager = (DevicePolicyManager) reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE);
        this.deviceAdminComponent = new ComponentName(reactContext, BlockAllDeviceAdminReceiver.class);
    }

    @Override
    public String getName() {
        return "AppBlocker";
    }

    private void sendEvent(String eventName, String message) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, message);
    }

    @ReactMethod
    public void checkDeviceAdminPermission(Promise promise) {
        boolean isAdmin = devicePolicyManager.isAdminActive(deviceAdminComponent);
        promise.resolve(isAdmin);
    }

    @ReactMethod
    public void requestDeviceAdminPermission(Promise promise) {
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, deviceAdminComponent);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Need device admin permission to block applications");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
        promise.resolve(true);
    }

    @ReactMethod
    public void checkPermissions(Promise promise) {
        AppOpsManager appOps = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, 
                                       Process.myUid(), reactContext.getPackageName());
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED);
    }

    @ReactMethod
    public void requestPermissions(Promise promise) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
        promise.resolve(true);
    }

    @ReactMethod
    public void blockApp(String packageName, Promise promise) {
        if (!devicePolicyManager.isAdminActive(deviceAdminComponent)) {
            promise.reject("PERMISSION_DENIED", "Device admin permission not granted");
            return;
        }

        this.allowedPackage = packageName;
        this.isBlocking = true;
        startBlockingTimer();
        promise.resolve(true);
    }

    @ReactMethod
    public void unblockApp(String packageName, Promise promise) {
        this.isBlocking = false;
        if (blockingTimer != null) {
            blockingTimer.cancel();
            blockingTimer = null;
        }
        promise.resolve(true);
    }

    private void startBlockingTimer() {
        if (blockingTimer != null) {
            blockingTimer.cancel();
        }

        blockingTimer = new Timer();
        blockingTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                if (!isBlocking) return;

                String currentApp = getCurrentForegroundApp();
                if (currentApp != null && !currentApp.equals(allowedPackage) && 
                    !currentApp.equals(reactContext.getPackageName())) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        devicePolicyManager.lockNow();
                        sendEvent("appBlocked", currentApp);
                    });
                }
            }
        }, 0, 1000); // Check every second
    }

    private String getCurrentForegroundApp() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        long time = System.currentTimeMillis();
        List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000*1000, time);
        
        if (stats != null) {
            SortedMap<Long, UsageStats> sortedMap = new TreeMap<>();
            for (UsageStats usageStats : stats) {
                sortedMap.put(usageStats.getLastTimeUsed(), usageStats);
            }
            
            if (!sortedMap.isEmpty()) {
                return sortedMap.get(sortedMap.lastKey()).getPackageName();
            }
        }
        return null;
    }
}
