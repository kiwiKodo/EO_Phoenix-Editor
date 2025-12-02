# Scheduler Cross-Midnight Solution

## Problem Description
The original scheduler had limitations when users wanted to set an ON time at 23:55 and an OFF time at midnight (24:00). The issues were:

1. **No 24:00 option**: The dropdown only went up to 23:55
2. **Missing 00:00 conflict**: If users could set 24:00, there was a risk that an immediate 00:00 ON time the next day would be missed
3. **Same-day validation**: The logic prevented OFF times that were earlier than or equal to ON times

## Solution Implemented

### 1. **Enhanced Time Options**
- Added 24:00 as an explicit option labeled "24:00 (midnight)"
- Added smart cross-midnight scheduling for late ON times (after 22:00)
- Show early morning OFF times with "+1 day" indicator for clarity

### 2. **Smart Validation Logic**
- **24:00 handling**: Always allow 24:00 as a valid end-of-day time
- **Cross-midnight detection**: For time differences >= 12 hours, assume next-day scheduling
- **Clear user feedback**: Improved error messages explaining cross-midnight options

### 3. **Android Compatibility**
- **Storage format**: Save 24:00 as 00:00 in JSON (Android's SimpleDateFormat doesn't support 24:00)
- **Display format**: Show 24:00 to users when 00:00 is stored with a late ON time (after 22:00)
- **Existing logic**: Leverage Android's existing cross-midnight handling (OFF <= ON becomes next day)

### 4. **User Experience Improvements**
- **Documentation**: Added explanation of cross-midnight scheduling
- **Visual indicators**: Mark next-day times clearly in dropdowns
- **Examples**: Provide concrete examples (ON: 23:55, OFF: 24:00 or 01:00 next day)

## How It Works

### Example Scenarios

#### Scenario 1: Late Night to Midnight
- **User selects**: ON at 23:55, OFF at 24:00
- **Stored as**: `{ on: "23:55", off: "00:00" }`
- **Android interprets**: OFF at 00:00 next day (since 00:00 <= 23:55)
- **Result**: Device turns off at midnight, avoids 00:00 conflict

#### Scenario 2: Late Night to Early Morning
- **User selects**: ON at 23:30, OFF at 01:00 (+1 day)
- **Stored as**: `{ on: "23:30", off: "01:00" }`
- **Android interprets**: OFF at 01:00 next day (since 01:00 <= 23:30)
- **Result**: Cross-midnight scheduling works correctly

#### Scenario 3: Normal Same-Day Schedule
- **User selects**: ON at 18:00, OFF at 21:00
- **Stored as**: `{ on: "18:00", off: "21:00" }`  
- **Android interprets**: OFF at 21:00 same day (since 21:00 > 18:00)
- **Result**: Standard same-day scheduling

### Android Implementation Details

The Android `ScheduleManager` already handles cross-midnight scheduling correctly:

```java
// From ScheduleManager.java line ~78
if (offMs <= onMs) {
    // off rolls to next day
    offMs = parseTimeForDay(ts.off, cursor, tz, 1);
}
```

This means our frontend solution works seamlessly with the existing Android logic.

## Benefits

1. **Solves the 23:55 → 24:00 problem**: Users can now schedule end-of-day shutdowns
2. **Prevents 00:00 conflicts**: Device properly handles midnight transitions
3. **Maintains compatibility**: Works with existing Android scheduler logic
4. **Improves UX**: Clear visual indicators and documentation
5. **Future-proof**: Handles all cross-midnight scenarios, not just 24:00

## Testing

Test these scenarios in the editor:

1. Set ON: 23:55, OFF: 24:00 → Should work and display correctly
2. Set ON: 22:30, OFF: 02:00 → Should show "02:00 (+1 day)" and work
3. Set ON: 18:00, OFF: 21:00 → Should work normally (same day)
4. Try to set ON: 18:00, OFF: 17:00 → Should show helpful error message

The solution is robust and handles edge cases while maintaining backward compatibility.