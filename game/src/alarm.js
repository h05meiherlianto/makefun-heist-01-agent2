// The alarm meter: the house's shared suspicion. It climbs while any
// guard or camera is actively spotting the thief and falls slowly when
// the thief is unseen. At 100 the house locks down — the exit seals,
// every guard runs for the thief, and the meter must be ridden out.

import { TUNING } from './config.js';

export function createAlarm() {
  return {
    value: 0,
    lockdown: false,
    lockdownLeft: 0,
    peak: 0,
  };
}

export function updateAlarm(alarm, dt, anySpotting, anyChase) {
  if (alarm.lockdown) {
    alarm.lockdownLeft -= dt;
    alarm.value = Math.max(0, alarm.value - dt * 6);
    if (alarm.lockdownLeft <= 0) {
      alarm.lockdown = false;
      alarm.value = 55;
    }
    return alarm;
  }
  if (anySpotting) {
    alarm.value += TUNING.alarmRisePerSecond * dt * (anyChase ? 1.6 : 1);
  } else {
    alarm.value -= TUNING.alarmDecayPerSecond * dt;
  }
  alarm.value = Math.max(0, Math.min(TUNING.alarmLockdownAt, alarm.value));
  alarm.peak = Math.max(alarm.peak, alarm.value);
  if (alarm.value >= TUNING.alarmLockdownAt) {
    alarm.lockdown = true;
    alarm.lockdownLeft = 10;
  }
  return alarm;
}

// 0 calm, 1 warm, 2 hot, 3 lockdown — used for HUD colour and siren.
export function alarmBand(alarm) {
  if (alarm.lockdown) return 3;
  if (alarm.value >= 70) return 2;
  if (alarm.value >= 35) return 1;
  return 0;
}
