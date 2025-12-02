# Cross-Day Schedule Processing Fix

## Issue Description
When users set up cross-midnight schedules like:
- **Monday**: ON 23:55, OFF 24:00 
- **Tuesday**: ON 00:00, OFF 00:05

The system was incorrectly saving this as:
```json
{
  "monday": [{ "on": "23:55", "off": "00:00" }],
  "tuesday": [{ "off": "00:05", "on": "00:00" }, ...]
}
```

This creates redundant transitions and conflicts.

## Root Cause
The original `processScheduleForSave` function only handled same-day merging but ignored cross-day scenarios where:
- Monday OFF at 24:00 (saved as 00:00) 
- Tuesday ON at 00:00
- These represent the same moment but weren't being merged

## Solution Implemented

### 1. **Cross-Day Detection Logic**
```typescript
// Handle cross-day merging (Monday OFF 24:00 + Tuesday ON 00:00)
for (let dayIndex = 0; dayIndex < dayOrder.length; dayIndex++) {
  const currentDay = dayOrder[dayIndex]
  const nextDay = dayOrder[(dayIndex + 1) % 7] // Wrap Sunday -> Monday
  
  const lastSlot = currentSlots[currentSlots.length - 1]
  const firstNextSlot = nextSlots[0]
  
  if (lastSlot?.off && firstNextSlot?.on) {
    const offTime = lastSlot.off === '24:00' ? '00:00' : lastSlot.off
    const nextOnTime = firstNextSlot.on
    
    // If current day OFF at midnight equals next day ON at midnight
    if (offTime === '00:00' && nextOnTime === '00:00') {
      // Remove OFF from current day (stay ON through midnight)
      delete lastSlot.off
      
      // Handle next day's first slot
      if (firstNextSlot.off) {
        delete firstNextSlot.on  // Keep as OFF-only
      } else {
        nextSlots.shift()        // Remove ON-only slot
      }
    }
  }
}
```

### 2. **Processing Flow**
1. **Copy all days** to processed schedule
2. **Cross-day merging**: Check each day's last slot against next day's first slot
3. **Same-day optimization**: Handle within-day merging and redundant slots
4. **Return optimized schedule**

## Test Cases

### Case 1: Basic Cross-Midnight
**Input:**
```json
{
  "monday": [{ "on": "23:55", "off": "24:00" }],
  "tuesday": [{ "on": "00:00", "off": "00:05" }]
}
```

**Output:**
```json
{
  "monday": [{ "on": "23:55" }],
  "tuesday": [{ "off": "00:05" }]
}
```

**Device Behavior:** ON from Monday 23:55 until Tuesday 00:05

### Case 2: Cross-Midnight with More Slots
**Input:**
```json
{
  "sunday": [{ "on": "22:00", "off": "24:00" }],
  "monday": [{ "on": "00:00", "off": "01:00" }, { "on": "06:00", "off": "08:00" }]
}
```

**Output:**
```json
{
  "sunday": [{ "on": "22:00" }],
  "monday": [{ "off": "01:00" }, { "on": "06:00", "off": "08:00" }]
}
```

**Device Behavior:** ON from Sunday 22:00 until Monday 01:00, then OFF until 06:00

### Case 3: Week Wrap-Around
**Input:**
```json
{
  "sunday": [{ "on": "23:30", "off": "24:00" }],
  "monday": [{ "on": "00:00", "off": "00:30" }]
}
```

**Output:**
```json
{
  "sunday": [{ "on": "23:30" }],
  "monday": [{ "off": "00:30" }]
}
```

**Device Behavior:** ON from Sunday 23:30 until Monday 00:30

## Benefits

✅ **Eliminates Redundant Transitions**: No unnecessary OFF→ON at midnight  
✅ **Reduces Android Wake-ups**: Fewer scheduled alarms  
✅ **Maintains User Intent**: Device behavior matches user expectations  
✅ **Handles Week Boundaries**: Sunday→Monday wrapping works correctly  
✅ **Preserves Existing Logic**: Same-day optimizations still work  

## Implementation Details

### Key Changes
1. **Added day ordering array** for proper cross-day iteration
2. **Implemented week wrap-around** (Sunday→Monday using modulo)
3. **Enhanced slot manipulation** (delete properties vs. remove slots)
4. **Preserved existing same-day logic** after cross-day processing

### Edge Cases Handled
- **Week boundaries** (Sunday→Monday)
- **Mixed slot types** (ON-only, OFF-only, ON+OFF)
- **Multiple slots per day** (only affects adjacent days)
- **Empty days** (skipped safely)

This fix ensures that cross-midnight schedules are optimized correctly, eliminating the redundant transitions that were causing the JSON formatting issues.