# Test Case: Cross-Day Schedule Processing

## Input Schedule (User's Test Case)
```json
{
  "monday": [
    { "on": "23:55", "off": "24:00" }  // OFF at midnight
  ],
  "tuesday": [
    { "on": "00:00", "off": "00:05" }  // ON at midnight, OFF at 00:05
  ]
}
```

## Expected Output After Processing
```json
{
  "monday": [
    { "on": "23:55" }  // No OFF - stays ON through midnight
  ],
  "tuesday": [
    { "off": "00:05" }  // OFF-only at 00:05
  ]
}
```

## Processing Logic
1. **Cross-Day Detection**: Monday OFF 24:00 (stored as 00:00) equals Tuesday ON 00:00
2. **Remove Redundant Transition**: Delete Monday's OFF and Tuesday's ON
3. **Result**: Device stays ON from Monday 23:55 through Tuesday 00:05

## Why This Is Correct
- Eliminates unnecessary OFF→ON transition at midnight
- Device behavior: ON from 23:55 Monday until 00:05 Tuesday
- Optimizes Android scheduler (fewer wake-ups)
- Maintains user's intended schedule