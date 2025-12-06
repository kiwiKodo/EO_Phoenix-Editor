import React from 'react'
import ConfirmModal from './ConfirmModal'
import { showNotification } from './Notification'

declare global { interface Window { eo: any } }

type WifiSettings = {
  wifiSSID: string
  wifiPassword: string
  wifiMaxAttempts: number
  wifiAttemptDelay: number
  wifiEnableDelay: number
  wifiEnableBaseWaitMs: number
  wifiEnableMaxMultiplier: number
  wifiEnableMinMaxWaitMs: number
  wifiStatePollIntervalMs: number
  wifiEnablingExtraGraceMs: number
  wifiEnablingExtraPollMs: number
  addNetworkPostDelayMs: number
  addNetworkMaxAttempts: number
  addNetworkBaseRetryMs: number
  addNetworkMaxRetryMs: number
  timeZone?: string
  timeSyncDelay?: number
  startupDelay?: number
}

const defaultSettings: WifiSettings = {
  wifiSSID: '',
  wifiPassword: '',
  wifiMaxAttempts: 15,
  wifiAttemptDelay: 1000,
  wifiEnableDelay: 3000,
  wifiEnableBaseWaitMs: 1500,
  wifiEnableMaxMultiplier: 4,
  wifiEnableMinMaxWaitMs: 3000,
  wifiStatePollIntervalMs: 500,
  wifiEnablingExtraGraceMs: 10000,
  wifiEnablingExtraPollMs: 1000,
  addNetworkPostDelayMs: 400,
  addNetworkMaxAttempts: 6,
  addNetworkBaseRetryMs: 400,
  addNetworkMaxRetryMs: 3000,
  timeZone: 'Pacific/Auckland',
  timeSyncDelay: 3000,
  startupDelay: 5,
}

type CaptionSettings = {
  fontSize: number
  width: number
  padding: number
  shrinkToFit: boolean
  style?: 'boxed' | 'overlay'
}

const defaultCaptionSettings: CaptionSettings = {
  fontSize: 24,
  width: 300,
  padding: 12,
  shrinkToFit: true,
  style: 'boxed'
}

export default function SettingsEditor(){
  const [page, setPage] = React.useState<'wifi'|'slideshow'|'schedule'|'system'|'captions'|'eo2setup'>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        const p = parsed?.lastSettingsPage
        if (p === 'wifi' || p === 'slideshow' || p === 'schedule' || p === 'system' || p === 'captions' || p === 'eo2setup') return p
      }
    } catch (e) { /* ignore */ }
    return 'slideshow'
  })
  // EO2 Setup sub-section (overview | access)
  const [eo2Section, setEo2Section] = React.useState<'overview'|'access'|'configuration'|'sideload'|'desktopapp'|'slideshow'>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        // desktopapp JSX was accidentally placed here — keep initializer focused on reading persisted subpage
        const parsed = JSON.parse(raw)
        const s = parsed?.lastSettingsSubPage
        if (s === 'overview' || s === 'access' || s === 'configuration' || s === 'sideload' || s === 'desktopapp' || s === 'slideshow') return s
      }
    } catch (e) { /* ignore */ }
    return 'overview'
  })
  const [wifi, setWifi] = React.useState<WifiSettings>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Prefer nested wifi object if present
        if (parsed.wifi && typeof parsed.wifi === 'object') {
          const fromWifi = { ...defaultSettings, ...parsed.wifi }
          fromWifi.wifiSSID = ''
          fromWifi.wifiPassword = ''
          return fromWifi
        }
        // Fallback to flat structure (legacy)
        const merged = { ...defaultSettings, ...(parsed || {}) }
        merged.wifiSSID = ''
        merged.wifiPassword = ''
        return merged
      }
    } catch (err) { /* ignore */ }
    return defaultSettings
  })

  type ScheduleSlot = { on?: string; off?: string }
  type Schedule = Record<string, ScheduleSlot[]>

  const defaultSchedule: Schedule = {
    monday: [ { on: '06:00', off: '07:30' }, { on: '18:00', off: '22:00' }, { on: '23:00', off: '00:00' } ],
    tuesday: [ { on: '06:00', off: '07:30' }, { on: '18:00', off: '22:00' }, { on: '23:00', off: '00:00' } ],
    wednesday: [ { on: '06:00', off: '07:30' }, { on: '18:00', off: '22:00' }, { on: '23:00', off: '00:00' } ],
    thursday: [ { on: '06:00', off: '07:30' }, { on: '18:00', off: '22:00' }, { on: '23:00', off: '00:00' } ],
    friday: [ { on: '06:00', off: '07:30' }, { on: '18:00', off: '22:00' }, { on: '23:00', off: '00:00' } ],
    saturday: [ { on: '08:00', off: '09:00' }, { on: '19:00', off: '00:00' } ],
    sunday: [ { on: '08:00', off: '09:00' }, { on: '19:00', off: '00:00' } ],
  }

  // Initialize schedule from localStorage if present (mimic WiFi settings behavior).
  // Falls back to empty schedule if nothing is stored.
  const [schedule, setSchedule] = React.useState<Schedule>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // If an alwaysOn flag is present, prefer the always-on schedule
        if (parsed.alwaysOn) {
          return {
            monday: [{ on: '00:00', off: '24:00' }],
            tuesday: [{ on: '00:00', off: '24:00' }],
            wednesday: [{ on: '00:00', off: '24:00' }],
            thursday: [{ on: '00:00', off: '24:00' }],
            friday: [{ on: '00:00', off: '24:00' }],
            saturday: [{ on: '00:00', off: '24:00' }],
            sunday: [{ on: '00:00', off: '24:00' }]
          }
        }
        // Saved files may contain schedule under `schedule` key or as top-level day keys
        if (parsed.schedule) return parsed.schedule as Schedule
        // If parsed already has day keys (monday, tuesday...), treat it as a schedule object
        if (parsed.monday) return parsed as Schedule
      }
    } catch (err) {
      // ignore parse errors and fall through to empty
    }

    return {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  })

  const setField = <K extends keyof WifiSettings>(k: K, v: WifiSettings[K]) => {
    setWifi(prev => ({ ...prev, [k]: v }))
  }

  // Build timezone options. Prefer Intl.supportedValuesOf if available; fall back to a common IANA list.
  const FALLBACK_TIMEZONES = [
    'UTC','Pacific/Auckland','Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver','America/Chicago','America/New_York',
    'America/Caracas','America/Sao_Paulo','Europe/London','Europe/Dublin','Europe/Paris','Europe/Berlin','Europe/Moscow','Asia/Dubai',
    'Asia/Karachi','Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Hong_Kong','Asia/Shanghai','Asia/Tokyo','Australia/Sydney','Pacific/Chatham'
  ]
  let zones: string[] = FALLBACK_TIMEZONES
  try {
    // Some engines support this API and provide a full list
    // @ts-ignore
    if (typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf) {
      // @ts-ignore
      zones = (Intl as any).supportedValuesOf('timeZone')
    }
  } catch (e) {
    // ignore and use fallback
  }

  // Slideshow settings
  type SlideshowSettings = {
    folder: string
    slideshowDelay: number
    shuffle: boolean
    loopVideos: boolean
    allowFullLengthVideos: boolean
    maxVideoSizeKB: number
    maxVideoPixels: number
    brightness: string
  }

  const defaultSlideshow: SlideshowSettings = {
    folder: '',
    slideshowDelay: 30,
    shuffle: true,
    loopVideos: true,
    allowFullLengthVideos: true,
    maxVideoSizeKB: 4096,
    maxVideoPixels: 2073600,
    brightness: '7'
  }

  const [slideshow, setSlideshow] = React.useState<SlideshowSettings>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Prefer nested slideshow object
        if (parsed.slideshow && typeof parsed.slideshow === 'object') {
          return { ...defaultSlideshow, ...parsed.slideshow }
        }
        // Fallback to flat structure (legacy)
        const ss: any = { ...defaultSlideshow }
        let found = false
        for (const k of Object.keys(defaultSlideshow) as Array<keyof SlideshowSettings>) {
          if (k in parsed) { ss[k] = (parsed as any)[k]; found = true }
        }
        if (found) return ss
      }
    } catch (err) { /* ignore */ }
    return defaultSlideshow
  })

  // Local UI toggle to enable advanced slideshow settings
  const [slideshowAdvanced, setSlideshowAdvanced] = React.useState<boolean>(false)

  // Local UI toggle to enable advanced wifi settings
  const [wifiAdvanced, setWifiAdvanced] = React.useState<boolean>(false)
  
  // Local UI toggle to enable advanced system settings
  const [systemAdvanced, setSystemAdvanced] = React.useState<boolean>(false)

  // Always-on schedule toggle: when enabled, schedule is set to everyday ON 00:00 / OFF 24:00
  const [alwaysOn, setAlwaysOn] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      return !!parsed.alwaysOn
    } catch (e) { return false }
  })
  const prevScheduleRef = React.useRef<Schedule | null>(null)

  // On mount, restore any previously persisted schedule snapshot so we can
  // re-apply it when Always on is toggled off even across restarts.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      if (parsed && parsed.prevSchedule) {
        prevScheduleRef.current = parsed.prevSchedule as Schedule
      }
    } catch (e) { /* ignore */ }
  }, [])

  const setSlideField = <K extends keyof SlideshowSettings>(k: K, v: SlideshowSettings[K]) => {
    setSlideshow(prev => ({ ...prev, [k]: v }))
  }

  // Logging settings
  type LoggingSettings = {
    logRotationSizeBytes: number
    logBufferLines: number
    logRotationRetention: number
    logRotationCompress: boolean
  }

  const defaultLogging: LoggingSettings = {
    logRotationSizeBytes: 10485760,
    logBufferLines: 500,
    logRotationRetention: 3,
    logRotationCompress: true
  }

  const [logging, setLogging] = React.useState<LoggingSettings>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Prefer nested logging object
        if (parsed.logging && typeof parsed.logging === 'object') {
          return { ...defaultLogging, ...parsed.logging }
        }
        // Fallback to flat structure (legacy)
        const lg: any = { ...defaultLogging }
        let found = false
        for (const k of Object.keys(defaultLogging) as Array<keyof LoggingSettings>) {
          if (k in parsed) { lg[k] = (parsed as any)[k]; found = true }
        }
        if (found) return lg
      }
    } catch (err) { /* ignore */ }
    return defaultLogging
  })

  const setLogField = <K extends keyof LoggingSettings>(k: K, v: LoggingSettings[K]) => {
    setLogging(prev => ({ ...prev, [k]: v }))
  }

  // System (storage) settings
  type SystemSettings = {
    sdWaitMaxAttempts: number
    sdWaitDelayMs: number
    rotateDirection?: 'clockwise' | 'anticlockwise'
  }

  const defaultSystem: SystemSettings = {
    sdWaitMaxAttempts: 5,
    sdWaitDelayMs: 2000
    , rotateDirection: 'clockwise'
  }

  const [system, setSystem] = React.useState<SystemSettings>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Prefer nested system object
        if (parsed.system && typeof parsed.system === 'object') {
          return { ...defaultSystem, ...parsed.system }
        }
        // Fallback to flat structure (legacy)
        const ss: any = { ...defaultSystem }
        let found = false
        for (const k of Object.keys(defaultSystem) as Array<keyof SystemSettings>) {
          if (k in parsed) { ss[k] = (parsed as any)[k]; found = true }
        }
        if (found) return ss
      }
    } catch (err) { /* ignore */ }
    return defaultSystem
  })

  const setSystemField = <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) => {
    setSystem(prev => ({ ...prev, [k]: v }))
  }

  // Captions settings
  const [captions, setCaptions] = React.useState<CaptionSettings>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Prefer top-level captions
        if (parsed.captions && typeof parsed.captions === 'object') {
          return { ...defaultCaptionSettings, ...parsed.captions }
        }
        // Fallback to media.captionSettings (legacy)
        if (parsed.media && parsed.media.captionSettings) {
          return { ...defaultCaptionSettings, ...parsed.media.captionSettings }
        }
      }
    } catch (e) { /* ignore */ }
    return defaultCaptionSettings
  })

  const setCaptionField = <K extends keyof CaptionSettings>(k: K, v: CaptionSettings[K]) => {
    setCaptions(prev => ({ ...prev, [k]: v }))
  }

  // Persist captions quickly and notify other components so editors update live as you type
  const capsSaveTimeout = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (capsSaveTimeout.current) window.clearTimeout(capsSaveTimeout.current)
    capsSaveTimeout.current = window.setTimeout(() => {
      try {
        // Only write top-level captions to avoid duplicating into media.captionSettings.
        // Media consumers will still read media.captionSettings as a fallback.
        const raw = localStorage.getItem('eo-settings')
        const parsed = raw ? JSON.parse(raw) : {}
        parsed.captions = captions
        localStorage.setItem('eo-settings', JSON.stringify(parsed))
        try { window.dispatchEvent(new CustomEvent('eo:settings-changed', { detail: { sections: ['captions'] } })) } catch (e) {}
      } catch (e) { /* ignore */ }
    }, 150)
    return () => { if (capsSaveTimeout.current) window.clearTimeout(capsSaveTimeout.current) }
  }, [captions])

  // Persist last visited settings page so we can restore it on next open
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.lastSettingsPage = page
      localStorage.setItem('eo-settings', JSON.stringify(parsed))
    } catch (e) { /* ignore */ }
  }, [page])

  // Persist WiFi credentials securely (opt-in). UI toggles this. Credentials stored via main/keytar.
  const [persistCreds, setPersistCreds] = React.useState<boolean>(false)

  // On mount, attempt to read stored creds from keytar (via preload)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // @ts-ignore
        const r = await window.eo?.getWifiCreds()
        if (!r || !r.ok) return
        if (cancelled) return
        const creds = r.creds
        if (creds && typeof creds === 'object') {
          // populate fields but avoid persisting back to localStorage
          setWifi(prev => ({ ...prev, wifiSSID: creds.ssid || '', wifiPassword: creds.password || '' }))
          setPersistCreds(true)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When wifi fields change and persistCreds is enabled, update secure store
  React.useEffect(() => {
    if (!persistCreds) return
    let to = window.setTimeout(async () => {
      try {
        // @ts-ignore
        await window.eo?.setWifiCreds({ ssid: wifi.wifiSSID || '', password: wifi.wifiPassword || '' })
      } catch (e) { /* ignore */ }
    }, 300)
    return () => clearTimeout(to)
  }, [wifi.wifiSSID, wifi.wifiPassword, persistCreds])

  const handleLoad = async () => {
    // Try to open the file picker in the last-used settings load folder
    let lastLoadFolder: string | undefined
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      lastLoadFolder = parsed?.settingsLoadFolder
    } catch (e) { /* ignore */ }

    const r = await window.eo.loadSettings({ defaultPath: lastLoadFolder })
    if (!r || !r.ok) {
      if (r?.error !== 'no-file-selected') {
        try { showNotification('Load failed: ' + (r?.error || 'Unknown error'), 4000, 'error') } catch (e) { /* ignore */ }
      }
      return
    }
    
    const parsed = r.parsed
    
    // Load wifi settings (support both nested and flat structure for backwards compatibility)
    const newWifi = { ...wifi }
    if (parsed.wifi && typeof parsed.wifi === 'object') {
      // Nested structure (preferred)
      Object.assign(newWifi, parsed.wifi)
    } else {
      // Flat structure (legacy)
      for (const k of Object.keys(defaultSettings) as Array<keyof WifiSettings>) {
        if (k in parsed) (newWifi as any)[k] = (parsed as any)[k]
      }
    }
    setWifi(newWifi)
    
    // Load slideshow settings (support both nested and flat)
    if (parsed.slideshow && typeof parsed.slideshow === 'object') {
      setSlideshow({ ...defaultSlideshow, ...parsed.slideshow })
    } else {
      const newSs: any = { ...defaultSlideshow }
      for (const k of Object.keys(defaultSlideshow) as Array<keyof SlideshowSettings>) {
        if (k in parsed) newSs[k] = (parsed as any)[k]
      }
      setSlideshow(newSs)
    }
    
    // Load logging settings (support both nested and flat)
    if (parsed.logging && typeof parsed.logging === 'object') {
      setLogging({ ...defaultLogging, ...parsed.logging })
    } else {
      const newLg: any = { ...defaultLogging }
      for (const k of Object.keys(defaultLogging) as Array<keyof LoggingSettings>) {
        if (k in parsed) newLg[k] = (parsed as any)[k]
      }
      setLogging(newLg)
    }

    // Load system settings (support both nested and flat)
    if (parsed.system && typeof parsed.system === 'object') {
      setSystem({ ...defaultSystem, ...parsed.system })
    } else {
      const newSys: any = { ...defaultSystem }
      for (const k of Object.keys(defaultSystem) as Array<keyof SystemSettings>) {
        if (k in parsed) newSys[k] = (parsed as any)[k]
      }
      setSystem(newSys)
    }

    // Load captions (nested or from media.captionSettings)
    if (parsed.captions) {
      setCaptions({ ...defaultCaptionSettings, ...parsed.captions })
    } else if (parsed.media && parsed.media.captionSettings) {
      setCaptions({ ...defaultCaptionSettings, ...parsed.media.captionSettings })
    }

    // Load schedule
    if (parsed.schedule) setSchedule(parsed.schedule)
  try { showNotification('Settings loaded from ' + r.path, 3000, 'success') } catch (e) { /* ignore */ }

    // Persist last load folder for next time
    try {
      const fp: string = r.path
      const idx = Math.max(fp.lastIndexOf('\\'), fp.lastIndexOf('/'))
      if (idx > 0) {
        const folder = fp.substring(0, idx)
        const raw = localStorage.getItem('eo-settings')
        const store = raw ? JSON.parse(raw) : {}
        store.settingsLoadFolder = folder
        localStorage.setItem('eo-settings', JSON.stringify(store))
      }
    } catch (e) { /* ignore */ }
  }

  // Process schedule to remove unnecessary transitions (equal OFF/ON times)
  const processScheduleForSave = (schedule: Schedule): Schedule => {
    const processed: Schedule = {}
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    // First, copy all days to processed
    for (const day of dayOrder) {
      processed[day] = [...(schedule[day] || [])]
    }
    
    // Handle cross-day merging (Monday OFF 24:00 + Tuesday ON 00:00)
    for (let dayIndex = 0; dayIndex < dayOrder.length; dayIndex++) {
      const currentDay = dayOrder[dayIndex]
      const nextDay = dayOrder[(dayIndex + 1) % 7] // Wrap Sunday -> Monday
      
      const currentSlots = processed[currentDay]
      const nextSlots = processed[nextDay]
      
      if (!currentSlots?.length || !nextSlots?.length) continue
      
      // Check if current day's last slot has OFF at 24:00/00:00
      const lastSlot = currentSlots[currentSlots.length - 1]
      const firstNextSlot = nextSlots[0]
      
      if (lastSlot?.off && firstNextSlot?.on) {
        const offTime = lastSlot.off === '24:00' ? '00:00' : lastSlot.off
        const nextOnTime = firstNextSlot.on
        
        // If current day OFF at midnight equals next day ON at midnight
        if (offTime === '00:00' && nextOnTime === '00:00') {
          // Remove OFF from current day's last slot (stay ON through midnight)
          delete lastSlot.off
          
          // Remove the ON from next day's first slot
          if (firstNextSlot.off) {
            // If next slot has OFF, keep it as OFF-only
            delete firstNextSlot.on
          } else {
            // If next slot is ON-only, remove it entirely
            nextSlots.shift()
          }
        }
      }
    }
    
    // Process each day for same-day optimizations
    for (const [day, slots] of Object.entries(processed)) {
      const processedSlots: ScheduleSlot[] = []
      
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        const nextSlot = slots[i + 1]
        
        // Check if this slot's OFF time equals the next slot's ON time (same day)
        if (slot.off && nextSlot?.on) {
          const offTime = slot.off === '24:00' ? '00:00' : slot.off
          const nextOnTime = nextSlot.on
          
          // If OFF time equals next ON time, merge the slots
          if (offTime === nextOnTime) {
            // Create merged slot: keep current ON, use next slot's OFF
            const mergedSlot: ScheduleSlot = { on: slot.on }
            if (nextSlot.off) {
              mergedSlot.off = nextSlot.off
            }
            processedSlots.push(mergedSlot)
            i++ // Skip the next slot since we merged it
            continue
          }
        }
        
        // Check if this slot has equal ON and OFF times (invalid)
        if (slot.on && slot.off) {
          const onTime = slot.on
          const offTime = slot.off === '24:00' ? '00:00' : slot.off
          
          // Skip slots where ON equals OFF (no transition needed)
          if (onTime === offTime) {
            continue
          }
        }
        
        // Keep the slot as-is
        processedSlots.push(slot)
      }
      
      processed[day] = processedSlots
    }
    
    return processed
  }

  const handleSave = async () => {
    const processedSchedule = processScheduleForSave(schedule)
    // Build settings with nested structure only (no root-level duplication)
    const combined = {
      wifi: { ...wifi },
      slideshow: { ...slideshow },
      logging: { ...logging },
      system: { ...system },
      schedule: processedSchedule,
      captions: { ...captions },
      alwaysOn: alwaysOn
    }
    // Suggest last-used save folder when opening Save dialog
    let lastSaveFolder: string | undefined
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      lastSaveFolder = parsed?.settingsSaveFolder
    } catch (e) { /* ignore */ }

    // Build export object: merge existing localStorage `eo-settings` (to preserve media fields)
    // with the combined settings we're about to save.
    let exportObj: any = {}
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      
      // DO NOT export media block - it's Editor-specific (file paths, positions, scales)
      // The Android app doesn't need this data
      
      // Add all settings as nested objects (no root-level duplication)
      exportObj.wifi = combined.wifi
      exportObj.slideshow = combined.slideshow
      exportObj.logging = combined.logging
      exportObj.system = combined.system
      exportObj.captions = combined.captions
      exportObj.schedule = combined.schedule
      exportObj.alwaysOn = combined.alwaysOn
      
      // DO NOT preserve editor-specific fields like lastSettingsPage, settingsSaveFolder, etc.
      // Keep settings.json clean for Android app consumption
      
      // If alwaysOn is enabled, or the processed schedule is empty for all days,
      // provide the always-on schedule so the Android app will keep the display on.
      const allEmpty = Object.values(processedSchedule).every(arr => !arr || arr.length === 0)
      if (alwaysOn || allEmpty) {
        exportObj.schedule = {
          monday: [{ on: '00:00', off: '24:00' }],
          tuesday: [{ on: '00:00', off: '24:00' }],
          wednesday: [{ on: '00:00', off: '24:00' }],
          thursday: [{ on: '00:00', off: '24:00' }],
          friday: [{ on: '00:00', off: '24:00' }],
          saturday: [{ on: '00:00', off: '24:00' }],
          sunday: [{ on: '00:00', off: '24:00' }]
        }
      }
    } catch (e) {
      // fallback to combined if parse fails
      exportObj = combined
    }

    // Before saving, validate required fields. If any are missing, ask the user to confirm.
    const missing: string[] = []
    if (!combined.wifi.wifiSSID || combined.wifi.wifiSSID.trim() === '') missing.push('SSID')
    if (!combined.wifi.wifiPassword || combined.wifi.wifiPassword.trim() === '') missing.push('Password')
    if (!combined.wifi.timeZone || combined.wifi.timeZone.trim() === '') missing.push('Time zone')
    if (!combined.slideshow.folder || combined.slideshow.folder.trim() === '') missing.push('Folder name')

    const performSave = async (obj: any) => {
      const r = await window.eo.saveSettings(obj, { suggestedPath: lastSaveFolder })
      if (!r || !r.ok) {
        if (r?.error !== 'no-file-selected') {
          try { showNotification('Save failed: ' + (r?.error || 'Unknown error'), 4000, 'error') } catch (e) { /* ignore */ }
        }
        return
      }
      try { showNotification('Settings saved to ' + r.path, 3000, 'success') } catch (e) { /* ignore */ }

      // persist settings save folder
      try {
        const fp: string = r.path
        const idx = Math.max(fp.lastIndexOf('\\'), fp.lastIndexOf('/'))
        if (idx > 0) {
          const folder = fp.substring(0, idx)
          const raw = localStorage.getItem('eo-settings')
          const store = raw ? JSON.parse(raw) : {}
          store.settingsSaveFolder = folder
          localStorage.setItem('eo-settings', JSON.stringify(store))
        }
      } catch (e) { /* ignore */ }
    }

    if (missing.length > 0) {
      // store pending export and prompt the user
      pendingExportRef.current = exportObj
      setConfirmSaveMessage(
        <div>
          <p>The following required values are missing:</p>
          <ul>{missing.map(m => <li key={m}>{m}</li>)}</ul>
          <p>Do you want to continue saving anyway?</p>
        </div>
      )
      setConfirmSaveOpen(true)
      return
    }

    // No missing required fields: perform save immediately
    await performSave(exportObj)
  }

  // Called when user confirms saving despite missing fields
  const doConfirmedSave = async () => {
    setConfirmSaveOpen(false)
    const obj = pendingExportRef.current
    pendingExportRef.current = null
    if (!obj) return
    try {
      // reuse performSave logic by recomputing suggested folder
      let lastSaveFolder: string | undefined
      try {
        const raw = localStorage.getItem('eo-settings')
        const parsed = raw ? JSON.parse(raw) : {}
        lastSaveFolder = parsed?.settingsSaveFolder
      } catch (e) { /* ignore */ }
      const r = await window.eo.saveSettings(obj, { suggestedPath: lastSaveFolder })
      if (!r || !r.ok) {
        if (r?.error !== 'no-file-selected') {
          try { showNotification('Save failed: ' + (r?.error || 'Unknown error'), 4000, 'error') } catch (e) { /* ignore */ }
        }
        return
      }
      try { showNotification('Settings saved to ' + r.path, 3000, 'success') } catch (e) { /* ignore */ }
      try {
        const fp: string = r.path
        const idx = Math.max(fp.lastIndexOf('\\'), fp.lastIndexOf('/'))
        if (idx > 0) {
          const folder = fp.substring(0, idx)
          const raw = localStorage.getItem('eo-settings')
          const store = raw ? JSON.parse(raw) : {}
          store.settingsSaveFolder = folder
          localStorage.setItem('eo-settings', JSON.stringify(store))
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      try { showNotification('Save failed: ' + String(e), 4000, 'error') } catch (e2) { /* ignore */ }
    }
  }

  // Reset settings for the currently active page only.
  // If 'wifi' is active, reset WiFi to defaults (SSID/password blanked).
  // If 'schedule' is active, clear schedule entries.
  // Modal state used to replace native confirm() calls
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmTitle, setConfirmTitle] = React.useState<string | undefined>()
  const [confirmMessage, setConfirmMessage] = React.useState<React.ReactNode | undefined>()
  const pendingResetPage = React.useRef<string | null>(null)

  // Confirm modal state for save validation (missing required fields)
  const [confirmSaveOpen, setConfirmSaveOpen] = React.useState(false)
  const [confirmSaveMessage, setConfirmSaveMessage] = React.useState<React.ReactNode | undefined>()
  const pendingExportRef = React.useRef<any>(null)

  const resetAll = (targetPage?: string) => {
    // Build a page-specific confirm message and only reset that page's settings.
    const which = targetPage || page
    let confirmMsg = 'Reset all settings?'
    if (which === 'wifi') confirmMsg = 'Reset WiFi settings to recommended defaults? This will clear the SSID and password.'
    else if (which === 'schedule') confirmMsg = 'Reset all schedules? This will clear all times for every day.'
    else if (which === 'slideshow') confirmMsg = 'Reset slideshow settings to defaults? This will clear the selected folder and revert slideshow options.'
    else if (which === 'system') confirmMsg = 'Reset system settings to defaults? This will reset storage/logging options.'
    else if (which === 'captions') confirmMsg = 'Reset caption settings to defaults?'

    pendingResetPage.current = which
    setConfirmTitle('Reset settings')
    setConfirmMessage(confirmMsg)
    setConfirmOpen(true)
  }

  const doConfirmedReset = () => {
    const which = pendingResetPage.current
    pendingResetPage.current = null
    setConfirmOpen(false)

    switch (which) {
      case 'wifi': {
        const wifiDefaults = { ...defaultSettings, wifiSSID: '', wifiPassword: '' }
        setWifi(wifiDefaults)
        break
      }
      case 'schedule': {
        const empty: Schedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }
        setSchedule(empty)
        break
      }
      case 'slideshow': {
        setSlideshow(defaultSlideshow)
        break
      }
      case 'system': {
        setSystem(defaultSystem)
        setLogging(defaultLogging)
        break
      }
      case 'captions': {
        setCaptions(defaultCaptionSettings)
        break
      }
      case 'all': {
        // Reset all editable settings to their defaults. Preserve media block.
        setWifi({ ...defaultSettings, wifiSSID: '', wifiPassword: '' })
        setSlideshow(defaultSlideshow)
        setLogging(defaultLogging)
        setSystem(defaultSystem)
        setCaptions(defaultCaptionSettings)
        const empty: Schedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }
        setSchedule(empty)

        // Persist merged defaults into localStorage while preserving media block
        try {
          const raw = localStorage.getItem('eo-settings')
          const parsed = raw ? JSON.parse(raw) : {}
          const out: any = { ...(parsed || {}) }
          out.wifi = { ...defaultSettings, wifiSSID: '', wifiPassword: '' }
          out.slideshow = { ...defaultSlideshow }
          out.logging = { ...defaultLogging }
          out.system = { ...defaultSystem }
          out.captions = { ...defaultCaptionSettings }
          out.schedule = empty
          // preserve parsed.media if present
          if (parsed && parsed.media) out.media = parsed.media
          localStorage.setItem('eo-settings', JSON.stringify(out))
        } catch (e) { /* ignore */ }

        try { showNotification('All settings reset to defaults', 2200, 'success') } catch (e) { /* ignore */ }
        break
      }
      default: {
        // Unknown page: do nothing
        break
      }
    }

    try { showNotification('Settings reset', 1800, 'success') } catch (e) { /* ignore */ }
  }


  // Copy schedule from one day to another
  const copyDay = (targetDay: string, sourceDay: string) => {
    if (!sourceDay || sourceDay === targetDay) return
    const src = schedule[sourceDay] || []
    // clone slots
    const cloned = src.map(s => ({ ...(s || {}) }))
    setSchedule(prev => ({ ...prev, [targetDay]: cloned }))
  }

  // dropdown options
  const opts = {
    wifiMaxAttempts: [1,3,5,10,15,20],
    wifiAttemptDelay: [250,500,1000,1500,2000,3000],
    wifiEnableDelay: [500,1000,1500,3000,5000],
    wifiEnableBaseWaitMs: [500,1000,1500,2000],
    wifiEnableMaxMultiplier: [1,2,4,8],
    wifiEnableMinMaxWaitMs: [1000,2000,3000,5000],
    wifiStatePollIntervalMs: [200,500,1000],
    wifiEnablingExtraGraceMs: [0,5000,10000,20000],
    wifiEnablingExtraPollMs: [200,500,1000,2000],
    addNetworkPostDelayMs: [100,200,400,800],
    addNetworkMaxAttempts: [1,3,6,10],
    addNetworkBaseRetryMs: [200,400,800,1600],
    addNetworkMaxRetryMs: [1000,2000,3000,5000]
  } as const

  const helperText: Record<keyof WifiSettings, string> = {
    wifiSSID: 'WiFi network SSID (name).',
    wifiPassword: 'WiFi password (PSK).',
    wifiMaxAttempts: 'How many times to attempt connecting before giving up',
    wifiAttemptDelay: 'Delay between attempts in milliseconds (ms)',
    wifiEnableDelay: 'Delay after enabling WiFi hardware before attempting connections',
    wifiEnableBaseWaitMs: 'Base wait used when computing exponential backoff during enable',
    wifiEnableMaxMultiplier: 'Maximum multiplier applied to base wait during retries',
    wifiEnableMinMaxWaitMs: 'Minimum/maximum wait bounds when enabling WiFi',
    wifiStatePollIntervalMs: 'Interval for polling the WiFi state (ms)',
    wifiEnablingExtraGraceMs: 'Extra grace period to allow the device to fully enable WiFi hardware',
    wifiEnablingExtraPollMs: 'Polling interval while in the extra grace period',
    addNetworkPostDelayMs: 'Delay after adding a network before trying to connect',
    addNetworkMaxAttempts: 'How many times to retry adding a saved network',
    addNetworkBaseRetryMs: 'Base retry delay when adding networks',
    addNetworkMaxRetryMs: 'Maximum retry delay for adding networks',
    timeZone: 'IANA time zone used by the device (e.g. Pacific/Auckland).',
    timeSyncDelay: 'Delay in milliseconds used when attempting time synchronization (NTP)',
    startupDelay: 'Seconds to wait before starting the main application after boot.'
  }

  const renderWifiOpts = () => {
    return Object.keys(opts).map((key) => {
      const k = key as keyof typeof opts
      const options = opts[k]
      // @ts-ignore
      const val = wifi[k as keyof WifiSettings] as number
      return (
        <div key={key} style={{marginBottom:12}}>
          <label style={{display:'block'}}>{key}</label>
          <select title={key} value={String(val)} onChange={e => setField(key as any, Number(e.target.value))}>
            {options.map(o => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
          </select>
          <div className="fieldHelper">{(helperText as any)[key] + ' (recommended: ' + String((defaultSettings as any)[key]) + ').'}</div>
        </div>
      )
    })
  }

  const slideshowHelperText: Record<keyof SlideshowSettings, string> = {
    folder: 'Media folder name',
    slideshowDelay: 'Delay between slides in minutes.',
    shuffle: 'Shuffle the photo order each time the slideshow starts.',
    loopVideos: 'If selected, videos will loop continuously until the slideshow delay time is met.',
    allowFullLengthVideos: 'Allow playing full-length videos instead of truncating to slideshow delay.',
    maxVideoSizeKB: 'Maximum video file size accepted by the slideshow (KB). Larger files will be skipped',
    maxVideoPixels: 'Maximum pixel count (width*height) for videos. Larger resolutions will be skipped',
    brightness: 'Display brightness setting'
  }

  // helpers for schedule UI
  const timeToMinutes = (t?: string) => {
    if (!t) return 0
    // Handle special case of 24:00 (end of day)
    if (t === '24:00') return 0 // We use 0 to represent 24:00 internally
    const [hh, mm] = t.split(':').map(Number)
    return hh * 60 + mm
  }
  const minutesToTime = (m: number) => {
    // Handle 24:00 (represented as 0 minutes from midnight but displayed as 24:00)
    if (m === 0) return '00:00'
    const hh = Math.floor(m/60)
    const mm = m % 60
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
  }

  const addSlot = (day: string) => {
    const daySlots = schedule[day] || []
    const last = daySlots[daySlots.length-1]
    if (last && last.on && !last.off) {
      try { showNotification('Please set an Off time for the previous On-only entry before adding a new line.', 3000, 'error') } catch (e) { /* ignore */ }
      return
    }
    const newSlots = [...daySlots, {}]
    setSchedule(prev => ({ ...prev, [day]: newSlots }))
  }

  const setAlwaysOnToggle = (want: boolean) => {
    setAlwaysOn(want)
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}

      if (want) {
        // save previous schedule to restore later (persisted)
        const snapshot = JSON.parse(JSON.stringify(schedule || {}))
        prevScheduleRef.current = snapshot
        parsed.prevSchedule = snapshot
        parsed.alwaysOn = true
        localStorage.setItem('eo-settings', JSON.stringify(parsed))

        const always: Schedule = {
          monday: [{ on: '00:00', off: '24:00' }],
          tuesday: [{ on: '00:00', off: '24:00' }],
          wednesday: [{ on: '00:00', off: '24:00' }],
          thursday: [{ on: '00:00', off: '24:00' }],
          friday: [{ on: '00:00', off: '24:00' }],
          saturday: [{ on: '00:00', off: '24:00' }],
          sunday: [{ on: '00:00', off: '24:00' }],
        }
        setSchedule(always)
      } else {
        // restore previous schedule if present in memory or localStorage
        if (!prevScheduleRef.current) {
          try {
            const raw2 = localStorage.getItem('eo-settings')
            const parsed2 = raw2 ? JSON.parse(raw2) : {}
            if (parsed2 && parsed2.prevSchedule) prevScheduleRef.current = parsed2.prevSchedule
          } catch (e) { /* ignore */ }
        }

        if (prevScheduleRef.current) {
          setSchedule(prevScheduleRef.current)
          prevScheduleRef.current = null
        } else {
          // nothing to restore: clear to empty schedule
          setSchedule({ monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] })
        }

        // remove persisted prevSchedule and alwaysOn flag
        try {
          if (parsed && parsed.prevSchedule) delete parsed.prevSchedule
          parsed.alwaysOn = false
          localStorage.setItem('eo-settings', JSON.stringify(parsed))
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // best-effort: still apply in-memory behavior
      if (want) {
        prevScheduleRef.current = JSON.parse(JSON.stringify(schedule || {}))
        setSchedule({ monday: [{ on: '00:00', off: '24:00' }], tuesday: [{ on: '00:00', off: '24:00' }], wednesday: [{ on: '00:00', off: '24:00' }], thursday: [{ on: '00:00', off: '24:00' }], friday: [{ on: '00:00', off: '24:00' }], saturday: [{ on: '00:00', off: '24:00' }], sunday: [{ on: '00:00', off: '24:00' }] })
      } else {
        if (prevScheduleRef.current) {
          setSchedule(prevScheduleRef.current)
          prevScheduleRef.current = null
        }
      }
    }
  }

  const removeSlot = (day: string, idx: number) => {
    const daySlots = [...(schedule[day]||[])]
    daySlots.splice(idx,1)
    setSchedule(prev => ({ ...prev, [day]: daySlots }))
  }

  const setSlot = (day: string, idx: number, key: 'on'|'off', value: string) => {
    const daySlots = [...(schedule[day]||[])]
    const slot = { ...(daySlots[idx]||{}) }
    if (key === 'on') {
      // ensure ordering: cannot be earlier than previous line
      const prev = daySlots[idx-1]
      if (prev) {
        const min = prev.off || prev.on
        if (min && timeToMinutes(value) < timeToMinutes(min)) {
          try { showNotification('On time cannot be earlier than previous line', 3000, 'error') } catch (e) { /* ignore */ }
          return
        }
      }
      slot.on = value
      // if off exists and would create invalid same-day timing, clear it
      if (slot.off) {
        const offMins = timeToMinutes(slot.off)
        const onMins = timeToMinutes(value)
        // Allow cross-midnight scheduling: off time can be <= on time if it represents next day
        // Only clear if off time is clearly same-day and invalid
        if (offMins <= onMins && offMins !== 0) { // 0 minutes = 24:00 (next day)
          slot.off = undefined
        }
      }
    } else {
      // Enhanced off time validation for cross-midnight support
      const onVal = slot.on
      if (onVal) {
        const onMins = timeToMinutes(onVal)
        const offMins = timeToMinutes(value)
        
        // Handle 24:00 special case - save as 00:00 for Android compatibility
        let saveValue = value
        if (value === '24:00') {
          saveValue = '00:00'
        }
        
        // Check for equal ON/OFF times (warn user)
        if (offMins === onMins || (value === '24:00' && onVal === '00:00')) {
          try { showNotification('Warning: OFF time equals ON time. This slot will stay ON continuously.', 3000, 'default') } catch (e) { /* ignore */ }
        }
        
        // Allow 24:00 (0 minutes) as valid end-of-day time
        if (offMins === 0) {
          // 24:00 is always valid as end-of-day
          slot.off = saveValue
        } else if (offMins <= onMins) {
          // For same-day scheduling, OFF must be after ON
          try { showNotification('Off time must be later than On time for same-day scheduling', 3000, 'error') } catch (e) { /* ignore */ }
          return
        } else {
          slot.off = saveValue
        }
      } else {
        slot.off = value === '24:00' ? '00:00' : value
      }
    }
    daySlots[idx] = slot
    setSchedule(prev => ({ ...prev, [day]: daySlots }))
  }

  // Auto-save settings to localStorage with debounce (using nested structure).
  const saveTimeout = React.useRef<number | null>(null)
  React.useEffect(() => {
    // debounce 600ms
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(() => {
      try {
        // Read existing settings and merge rather than replacing the whole object.
        // This preserves unrelated keys such as media.files/imageTextList which
        // would otherwise be lost when auto-saving.
        const rawExisting = localStorage.getItem('eo-settings')
        const parsedExisting = rawExisting ? JSON.parse(rawExisting) : {}

        const toSave: any = { ...parsedExisting }

        // Store settings as nested objects (no root-level duplication)
        const cleanWifi = { ...wifi }
        cleanWifi.wifiSSID = ''
        cleanWifi.wifiPassword = ''
        
        toSave.wifi = cleanWifi
        toSave.slideshow = { ...slideshow }
        toSave.logging = { ...logging }
        toSave.system = { ...system }
        toSave.captions = { ...captions }
        toSave.alwaysOn = alwaysOn

        try {
          if (alwaysOn) {
            // persist always-on schedule instead of user schedule
            toSave.schedule = {
              monday: [{ on: '00:00', off: '24:00' }],
              tuesday: [{ on: '00:00', off: '24:00' }],
              wednesday: [{ on: '00:00', off: '24:00' }],
              thursday: [{ on: '00:00', off: '24:00' }],
              friday: [{ on: '00:00', off: '24:00' }],
              saturday: [{ on: '00:00', off: '24:00' }],
              sunday: [{ on: '00:00', off: '24:00' }]
            }
          } else {
            toSave.schedule = processScheduleForSave(schedule)
          }
        } catch (err) {
          // fallback to raw schedule if processing fails
          toSave.schedule = schedule
        }

        // preserve existing media block (don't modify it here)
        toSave.media = parsedExisting.media || toSave.media

        localStorage.setItem('eo-settings', JSON.stringify(toSave))
        // notify other components in this window that settings changed
        try { window.dispatchEvent(new CustomEvent('eo:settings-changed', { detail: { sections: ['captions'] } })) } catch (e) {}
      } catch (err) {
        // ignore storage errors
      }
    }, 600)

    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [wifi, slideshow, logging, system, schedule, captions])

  const helperContent = () => {
    switch (page) {
      case 'wifi':
        return (
          <div className="panel">
            <h3>Notes</h3>
            <h4>Time &amp; timezone</h4>
            <p>WiFi credentials and the selected timezone are used only to set the EO2 Frame's clock. When the SD card is inserted into the EO2 Frame, the EO Phoenix app will briefly connect to the configured WiFi network, attempt to fetch and apply the correct time settings, and then disconnect. This step is only required if you use scheduling; otherwise you can set the device time manually on the device.</p>
            <h4>Startup delay</h4>
            <p>The startup delay gives the system time to produce startup logs before the main application begins. Increase this only when troubleshooting slow storage or boot-time issues — it does not affect normal runtime behavior.</p>
            <h4>Advanced settings</h4>
            <p>If the WiFi connection cannot be established, the advanced options can improve the success rate by adjusting retry counts and timing. These settings tune connection attempts and backoff behavior to help with intermittent or slow networks.</p>
          </div>
        )
      case 'slideshow':
        return (
          <div className="panel">
            <h3>Notes</h3>
            <h4>Folder</h4>
            <p>Enter the name of the folder that contains the photos and videos you want displayed. This must match the folder name on the SD card under <code>EoPhoenix/</code>.</p>
            <h4>Rotation</h4>
            <p>Landscape images will be rotated automatically when saved to ensure compatibility with EO2 Frame media handling. Choose either <strong>Clockwise</strong> or <strong>Anti-clockwise</strong> to match your EO2 Frame's orientation.</p>
            <h4>Advanced settings</h4>
            <p>These options control acceptable video file sizes and resolutions. Larger or higher-resolution videos may play, but they can take longer to load and may be skipped on less-capable devices.</p>
          </div>
        )
      case 'captions':
        return (
          <div className="panel">
            <h3>Notes</h3>
            <h4>Adding captions</h4>
            <p>Captions can be added to each image using the Media Editor. Enter your text in the Caption box; multi-line captions are supported and line breaks will be preserved when exporting.</p>
            <h4>Export</h4>
            <p>Caption boxes are rendered on top of frames and included in exported images. Caption dimensions, padding and font settings determine how text wraps or scales inside the caption area.</p>
          </div>
        )
      case 'system':
        return (
          <div className="panel">
            <h3>Notes</h3>
            <h4>Storage</h4>
            <p>These settings control how the device waits for and detects the SD card during boot. Increase the retry count or delay if you have a slow card reader or the storage device takes extra time to initialise.</p>
            <h4>Logging</h4>
            <p>Logging controls local log buffering, rotation size and retention. Larger buffers reduce write frequency but use more memory; retention controls how many rotated log files are kept. Enable compression to save storage space at the cost of CPU time when rotating logs.</p>
          </div>
        )
      /* EO2 Setup helper content removed: EO2 Setup pages use the central main area only. */
      case 'schedule':
        return (
          <div className="panel">
            <h3>Notes</h3>
            <h4>Schedule</h4>
            <p>Define one or more On/Off slots per day to control when the display is active. If no slots are defined, or if <strong>Always on</strong> is enabled, the EO2 Frame will remain on continuously.</p>
            <h4>Time accuracy</h4>
            <p>If you use scheduling, ensure the EO2 Frame's clock is correct. You can set the time on the device manually or allow the EO Phoenix app to synchronize time over the network — this requires WiFi to be configured (SSID, password and timezone must be set on the WiFi page).</p>
            <h4>Off-hours behavior</h4>
            <p>Apps cannot wake the EO2 Frame when it is powered off. During Off hours the EO Phoenix app will remove displayed media and dim the display; it will not fully power down. Use the device's hardware button to turn the display on or off manually if needed.</p>
          </div>
        )
      default:
        return (
          <div className="panel">
            <h3>Help</h3>
            <p>Select a section on the left to edit its settings. Use Load/Save to import/export settings.json for the Android app.</p>
          </div>
        )
    }
  }

  return (
    <div className="settingsLayout">
      <aside className="sidebar">
        <nav className="sidebarNav">
            <div className="navItem">
              <button className="menuBtn" onClick={() => { setPage('eo2setup'); setEo2Section('overview') }} aria-pressed={page==='eo2setup'}>EO2 Setup</button>
              {page === 'eo2setup' ? (
                <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:6}}>
                  <button className="menuBtn" onClick={() => setEo2Section('overview')} aria-pressed={eo2Section==='overview'}>Overview</button>
                  <button className="menuBtn" onClick={() => setEo2Section('access')} aria-pressed={eo2Section==='access'}>Access</button>
                  <button className="menuBtn" onClick={() => setEo2Section('configuration')} aria-pressed={eo2Section==='configuration'}>Configuration</button>
                  <button className="menuBtn" onClick={() => setEo2Section('sideload')} aria-pressed={eo2Section==='sideload'}>EO2 device app</button>
                  <button className="menuBtn" onClick={() => setEo2Section('desktopapp')} aria-pressed={eo2Section==='desktopapp'}>Desktop app</button>
                  <button className="menuBtn" onClick={() => setEo2Section('slideshow')} aria-pressed={eo2Section==='slideshow'}>Slideshow</button>
                </div>
              ) : null}
            </div>
            <div className="sdCardDivider" />
          <div className="navItem">
            <button className="menuBtn" onClick={() => setPage('slideshow')} aria-pressed={page==='slideshow'}>Slideshow</button>
            {page === 'slideshow' ? <button className="danger smallReset" onClick={() => resetAll('slideshow')}>Reset Slideshow Settings</button> : null}
          </div>
          <div className="navItem">
            <button className="menuBtn" onClick={() => setPage('schedule')} aria-pressed={page==='schedule'}>Schedule</button>
            {page === 'schedule' ? <button className="danger smallReset" onClick={() => resetAll('schedule')}>Reset Schedule</button> : null}
          </div>
          <div className="navItem">
            <button className="menuBtn" onClick={() => setPage('wifi')} aria-pressed={page==='wifi'}>WiFi</button>
            {page === 'wifi' ? <button className="danger smallReset" onClick={() => resetAll('wifi')}>Reset WiFi Settings</button> : null}
          </div>
          <div className="navItem">
            <button className="menuBtn" onClick={() => setPage('captions')} aria-pressed={page==='captions'}>Captions</button>
            {page === 'captions' ? <button className="danger smallReset" onClick={() => resetAll('captions')}>Reset Captions</button> : null}
          </div>
          <div className="navItem">
            <button className="menuBtn" onClick={() => setPage('system')} aria-pressed={page==='system'}>System</button>
            {page === 'system' ? <button className="danger smallReset" onClick={() => resetAll('system')}>Reset System Settings</button> : null}
          </div>
        </nav>
        <div className="sidebarActions">
          <button onClick={handleLoad}>Load Settings</button>
          <button className="primary" onClick={handleSave}>Save Settings</button>
          <button className="danger" onClick={() => resetAll('all')}>Reset Settings</button>
        </div>
        <div className="sdCardFooter">
          <div className="sdCardDivider" />
          <div className="sdCardGuide">
            <div className="sdTitle">SD Card layout (for Android app)</div>
            <div className="sdTree">
              <div className="sdNode">SD Card
                <div className="sdChild">EoPhoenix/
                  <div className="sdChild">[Media Folder 1]/</div>
                  <div className="sdChild">[Media Folder 2]/</div>
                  <div className="sdChild">settings.json</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

  <main className="settingsMain">
        {page === 'eo2setup' && eo2Section === 'overview' && (
          <section>
            <h2>Overview</h2>
            <div>
              <p>The EO Phoenix setup consists of two parts:</p>
              <ul>
                <li><strong>EO Phoenix Android app</strong> — the app that runs on the EO2 frame (sideload this onto the device).</li>
                <li><strong>EO Phoenix Editor</strong> — the desktop app used to prepare settings and media (this editor).</li>
              </ul>
              <p>The slideshow runs from an SD card inserted into the EO2 frame.</p>
              <div className="fieldHelper">Note: Because repeatedly connecting and removing a keyboard or SD card can stress the EO2 device's USB connector, and wall-mounted devices may have clearance issues, we recommend using a right-angle USB cable that can remain connected to the device and plugging peripherals into that cable.</div>
              <p>The EO2 device UI will need to be accessed initially to make device settings and install the EO Phoenix app. A USB keyboard is required for this step to navigate the device UI. Once the app is installed, you should no longer need to access the device UI.</p>

              <h4>When keyboard navigation fails</h4>
              <p>A USB keyboard is normally enough to navigate and configure the frame. If it does not work, try these options:</p>
              <ul>
                <li><strong>Soft reset:</strong> long‑press the physical button on the back of the frame (top centre).</li>
                <li><strong>Factory reset:</strong> press and hold the recessed factory reset button on the back for approximately 5 seconds (the button is behind a small hole in the fourth row of holes from the top, left of centre). Keep holding until the display flashes white, then release. Use a toothpick or similar tool to reach it.</li>
              </ul>
              <h4>Factory Reset First</h4>
              <p>Factory-reset the device before starting configuration to ensure the device is in a known state. Press and hold the recessed factory reset button on the back for approximately 5 seconds (the button is behind a small hole in the fourth row of holes from the top, left of centre). Keep holding until the display flashes white, then release. Use a toothpick or similar tool to reach it.</p>
              <p>Alternatively, run a factory data reset via the Android menu by going to Reset, then Factory data reset. NOTE: this will erase all data from the device's internal storage.</p>
            </div>
          </section>
        )}
        {page === 'eo2setup' && eo2Section === 'desktopapp' && (
          <section>
            <h2>Desktop app</h2>
            <div>
              <p>The EO Phoenix Editor provides an easy way of preparing the configuration settings of the EO Phoenix Android App, and organising the slideshows.</p>

              <p>Navigate through the Settings in the left side menu and set up as required. Most options are pre-set.</p>

              <p>Switch to the Media Editor (top right) to select images for the slideshow. Some additional options have been provided, such as frame and caption options.</p>

              <h4>Settings file</h4>
              <p>A <code>settings.json</code> file will be created when you save. To create the file, click the <strong>Save Settings</strong> button on the left once setup is complete. Add the resulting <code>settings.json</code> to the SD card inside the top-level <code>EoPhoenix</code> parent folder. See the SD Card layout in the bottom-left corner.</p>

              <h4>Media Folders</h4>
              <p>Multiple media folders can be added to the SD card within the <code>EoPhoenix</code> parent folder. In the Slideshow Settings Menu, enter the name of the media folder you wish to display on the EO2 device. This name must match exactly the actual folder name.</p>

              <h4>Video</h4>
              <p>The EO Phoenix Android App supports video or GIF content. Results may vary depending on video size and resolution. Video cannot be added from the EO Phoenix Editor; please add video files manually to the media folder.</p>
            </div>
          </section>
        )}

        {page === 'eo2setup' && eo2Section === 'access' && (
          <section>
            <h2>Access</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div>
                <p>The EO2 frame runs Android KitKat (API 19). You can control the device using a USB keyboard connected to the port on the back.</p>

                <h4>Keyboard shortcuts</h4>
                <ul>
                  <li><strong>Windows+L</strong> — use this to access the device UI (brings up the main screen).</li>
                  <li><strong>Tab/arrow keys</strong> — navigate menus.</li>
                  <li><strong>Enter</strong> — select item.</li>
                  <li><strong>Escape</strong> — go back.</li>
                  <li><strong>Ctrl+Alt+Del</strong> — restart the device if it becomes unresponsive.</li>
                </ul>

                <p>If a menu cannot be reached, restart with <strong>Ctrl+Alt+Del</strong> and try again.</p>

                <h4>Initial setup notes</h4>
                <p>The device UI can be accessed at any time. Initially the device may show Google Calendar. If no Google account is recognized you will be offered three choices: <em>Existing</em> (use this), <em>New</em>, and <em>Not now</em>.</p>
                <p>If the display stays on the Google Calendar screen, press <strong>Delete</strong> and then try <strong>Windows+L</strong> again. If that fails, restart the device with <strong>Ctrl+Alt+Del</strong> and try again.</p>

                <p>When you reach the WiFi settings screen, use <strong>Tab</strong> to highlight the <strong>Back</strong> option at the top-left, then press <strong>Enter</strong> to return to the main menu.</p>
              </div>
            </div>
          </section>
        )}

        {page === 'eo2setup' && eo2Section === 'configuration' && (
          <section>
            <h2>Configuration</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div>
                <h4>Security</h4>
                <p>Enable <strong>Unknown sources</strong> (or the equivalent "Install unknown apps") in the device Security settings to allow sideloading the EO Phoenix Android app.</p>

                <h4>Scheduling Configuration Settings</h4>
                <p>The EO Phoenix Android app requires a couple of device-level settings only if you intend to use scheduling. Follow the steps below to set them.</p>

                <h4>Wi‑Fi</h4>
                <p>Open the device <strong>Wi‑Fi</strong> menu. Use <strong>Tab</strong> to reach the On/Off toggle and press <strong>Enter</strong> to enable Wi‑Fi. <strong>Important:</strong> do not enter any Wi‑Fi credentials in the device Wi‑Fi menu from this screen.</p>

                <div className="fieldHelper">Note: if Wi‑Fi connect fails unexpectedly during slideshow initialisation, try accessing the device UI Wi‑Fi menu and toggle Wi‑Fi Off then On.</div>

                <h4>Date &amp; Time</h4>
                <p>Open the device <strong>Date &amp; Time</strong> menu and ensure <strong>Automatic date &amp; time</strong> is enabled. This allows the frame to keep accurate time for scheduled events.</p>

                <div className="fieldHelper">You have three options: enable Wi‑Fi and keep Automatic date &amp; time enabled so the app can fetch and maintain the correct clock; or leave Wi‑Fi off and set the timezone/date/time manually — the scheduler will use the device clock either way; or ignore these settings entirely if you do not intend to use scheduling.</div>
              </div>
            </div>
          </section>
        )}
        {page === 'eo2setup' && eo2Section === 'sideload' && (
          <section>
            <h2>Side load app</h2>
            <div>
              <p>The EO Phoenix app must be side loaded, rather than downloaded and installed from the app store.</p>
              <p>Download the latest release of the <code>eo-phoenix.apk</code> from the <a href="https://github.com/kiwiKodo/EO_Phoenix/releases/latest" target="_blank" rel="noopener noreferrer">GitHub repo</a>.</p>

              <h4>Prepare Bluetooth</h4>
              <p>Use <strong>Windows+L</strong> to access the device UI, and navigate to the Bluetooth menu. Ensure Bluetooth is turned on for both the EO2 device and the PC.</p>
              <p>On the EO2 device, select the device code listed to make it visible to other devices. On the PC, open Bluetooth settings and choose <strong>Add device</strong>, then follow the prompts to pair with the frame. Your PC should appear in the device's Paired Devices list once connected.</p>

              <h4>Send the APK</h4>
              <p>Navigate to the device's top-right overflow menu (three stacked dots) and select <strong>Show received files</strong>. On the PC, open Bluetooth settings and choose <strong>Send or receive files via Bluetooth</strong>, then <strong>Send files</strong>. Select your EO2 frame and choose the <code>eo-phoenix.apk</code> to begin the transfer.</p>

              <h4>Install on device</h4>
              <p>After the transfer completes on the frame, open the received file and install it. When installation finishes, choose <strong>Open</strong> to launch the app.</p>

              <h4>Notes</h4>
              <ul>
                <li>Bluetooth transfers can be slow; toggling Bluetooth Off and On on the device sometimes improves transfer speed.</li>
                <li>You may be prompted to <strong>Activate Device Administrator</strong> during install — select <strong>Activate</strong> to continue.</li>
                <li>If prompted to choose a home (launcher) app for the device, select <strong>EO Phoenix</strong> and choose <strong>Always</strong>.</li>
              </ul>
            </div>
          </section>
        )}
        {page === 'eo2setup' && eo2Section === 'slideshow' && (
          <section>
            <h2>Slideshow</h2>
            <div>
              <p>Once the EO Phoenix app has been installed on the device and started, an overview page will display with a log output.</p>

              <p>Install the SD card. The SD card must match the layout (bottom left corner), with the <code>settings.json</code> file and at least one media folder within the parent <code>EoPhoenix</code> folder.</p>

              <p>The EO Phoenix app will attempt to read the SD card and fetch the settings. The log output will display progress — this will also be saved to the SD Card for debugging if required.</p>

              <p>If setup is correct, the slideshow will initialise and begin playing.</p>

              <p>The schedule will maintain On/Off times; alternatively you can manually turn the display On/Off with the hardware button on the back.</p>

              <p>Removing the SD card will stop the slideshow and allow you to change settings or upload new media.</p>
            </div>
          </section>
        )}
        {page === 'wifi' && (
          <section>
            <h2>WiFi Settings</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div>
                <label>SSID</label>
                <input value={wifi.wifiSSID} onChange={e => setField('wifiSSID', e.target.value)} placeholder="Network SSID" />
                <div className="fieldHelper">Use a 2.4 GHz Wi‑Fi network only.</div>

                <label style={{marginTop:8}}>Password</label>
                <input value={wifi.wifiPassword} onChange={e => setField('wifiPassword', e.target.value)} placeholder="Password" />

                <div style={{marginTop:8}}>
                  <label><input type="checkbox" checked={persistCreds} onChange={async (e) => {
                    const want = e.target.checked
                    setPersistCreds(want)
                    try {
                      if (want) {
                        // store current creds
                        // @ts-ignore
                        await window.eo?.setWifiCreds({ ssid: wifi.wifiSSID || '', password: wifi.wifiPassword || '' })
                      } else {
                        // remove stored creds
                        // @ts-ignore
                        await window.eo?.clearWifiCreds()
                      }
                    } catch (err) { /* ignore */ }
                  }} /> Persist WiFi credentials securely (store in OS keychain)</label>
                </div>

                <div className="slideshowDivider" />

                <label style={{marginTop:8}}>Time zone</label>
                <select value={wifi.timeZone || ''} onChange={e => setField('timeZone' as any, e.target.value)}>
                  <option value="">-- select time zone --</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>

                <label style={{marginTop:8}}>Startup delay (s)</label>
                <select value={String(wifi.startupDelay || 0)} onChange={e => setField('startupDelay' as any, Number(e.target.value) || 0)}>
                  {/* include small common values; keep 5s default alongside suggested values */}
                  {[0,5,15,30,60].map(s => <option key={s} value={String(s)}>{s} s</option>)}
                </select>
                <div className="fieldHelper">{(helperText as any).startupDelay}</div>

                <div className="slideshowDivider" />

                <div className="advancedToggle settingRow">
                  <label><input type="checkbox" checked={wifiAdvanced} onChange={e => setWifiAdvanced(e.target.checked)} /> Advanced settings</label>
                </div>

                <div className={"advancedGroup " + (wifiAdvanced ? '' : 'disabled')}>
                  <div style={{marginTop:8}}>
                    <label>Time sync delay (ms)</label>
                    <select value={String(wifi.timeSyncDelay || 0)} onChange={e => setField('timeSyncDelay' as any, Number(e.target.value) || 0)} disabled={!wifiAdvanced}>
                      {[500,1000,2000,3000,5000,10000].map(n => <option key={n} value={String(n)}>{n} ms</option>)}
                    </select>
                    <div className="fieldHelper">{(helperText as any).timeSyncDelay + ' (recommended: ' + String(defaultSettings.timeSyncDelay) + ' ms).'}</div>
                  </div>

                  {renderWifiOpts()}
                </div>
                {/* Reset button removed — caption defaults are left to code changes only. */}

              </div>

              {/* helper moved to persistent right-hand helper sidebar */}
            </div>
          </section>
  )}

        {page === 'slideshow' && (
          <section>
            <h2>Slideshow</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div>
                <label>Folder</label>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input value={slideshow.folder} onChange={e => setSlideField('folder', e.target.value)} placeholder="Media folder name" />
                </div>

                <label style={{marginTop:18}}>Slideshow delay (minutes)</label>
                <input type="number" step="1" min={1} value={String(Math.round((slideshow.slideshowDelay||0)/60))} onChange={e => {
                  // UI shows whole minutes; convert to seconds for storage
                  const mins = Math.max(1, Math.round(Number(e.target.value) || 0))
                  setSlideField('slideshowDelay', mins * 60)
                }} />
                <div className="fieldHelper">{slideshowHelperText.slideshowDelay}</div>

                <div className="settingRow">
                  <label>Brightness</label>
                  <select title="Brightness" value={String(slideshow.brightness)} onChange={e => setSlideField('brightness', String(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => (i + 1)).map(n => (
                      <option key={n} value={String(n)}>{String(n)}</option>
                    ))}
                  </select>
                  <div className="fieldHelper">{slideshowHelperText.brightness + ' (recommended: ' + String(defaultSlideshow.brightness) + ').'}</div>
                </div>

                <div style={{marginTop:0}}>
                  <label><input type="checkbox" checked={slideshow.shuffle} onChange={e => setSlideField('shuffle', e.target.checked)} /> Shuffle</label>
                  <div className="fieldHelper">{slideshowHelperText.shuffle}</div>
                </div>
                <div>
                  <label><input type="checkbox" checked={slideshow.loopVideos} onChange={e => setSlideField('loopVideos', e.target.checked)} /> Loop videos</label>
                  <div className="fieldHelper">{slideshowHelperText.loopVideos}</div>
                </div>
                <div>
                  <label><input type="checkbox" checked={slideshow.allowFullLengthVideos} onChange={e => setSlideField('allowFullLengthVideos', e.target.checked)} /> Allow full length videos</label>
                  <div className="fieldHelper">{slideshowHelperText.allowFullLengthVideos}</div>
                </div>

                <label>Rotate saved images to portrait when exporting a landscape image</label>
                <div style={{marginTop:8}}>
                  <select value={(system as any).rotateDirection} onChange={e => setSystemField('rotateDirection' as any, e.target.value as any)}>
                    <option value="clockwise">Clockwise (default)</option>
                    <option value="anticlockwise">Anti-clockwise</option>
                  </select>
                  <div className="fieldHelper">If enabled, exported landscape images will be rotated to portrait when saving. Choose rotation direction.</div>
                </div>

                <div className="slideshowDivider" />
                <div className="advancedToggle settingRow">
                  <label><input type="checkbox" checked={slideshowAdvanced} onChange={e => setSlideshowAdvanced(e.target.checked)} /> Enable advanced settings</label>
                </div>

                <div className={"advancedGroup " + (slideshowAdvanced ? '' : 'disabled')}>
                  <div className="settingRow">
                    <label>Max video size (KB)</label>
                    <select title="Max video size (KB)" value={String(slideshow.maxVideoSizeKB)} onChange={e => setSlideField('maxVideoSizeKB', Number(e.target.value)||0)} disabled={!slideshowAdvanced}>
                      {[512,1024,2048,4096,8192,16384].map(n => (
                        <option key={n} value={String(n)}>{n.toLocaleString()} KB</option>
                      ))}
                    </select>
                    <div className="fieldHelper">{slideshowHelperText.maxVideoSizeKB + ' (recommended: ' + String(defaultSlideshow.maxVideoSizeKB) + ' KB).'}</div>
                  </div>

                  <div className="settingRow">
                    <label>Max video pixels</label>
                    <select title="Max video pixels" value={String(slideshow.maxVideoPixels)} onChange={e => setSlideField('maxVideoPixels', Number(e.target.value)||0)} disabled={!slideshowAdvanced}>
                      {/* common resolutions (pixels): 720p, 1080p, 1440p, 4K */}
                      <option value="921600">720p (1280×720)</option>
                      <option value="2073600">1080p (1920×1080)</option>
                      <option value="3686400">1440p (2560×1440)</option>
                      <option value="8294400">4K (3840×2160)</option>
                    </select>
                    <div className="fieldHelper">{slideshowHelperText.maxVideoPixels + ' (recommended: ' + String(defaultSlideshow.maxVideoPixels) + ' px).'}</div>
                  </div>
                </div>
              </div>

              {/* helper moved to persistent right-hand helper sidebar */}
            </div>
          </section>
        )}

        {page === 'captions' && (
          <section>
            <h2>Captions</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div>
                <label>Font size (px)</label>
                <input type="number" value={String(captions.fontSize)} onChange={e => setCaptionField('fontSize', Math.max(8, Number(e.target.value) || 8))} />

                <label style={{marginTop:8}}>Width (px)</label>
                <input type="number" value={String(captions.width)} onChange={e => setCaptionField('width', Math.max(8, Number(e.target.value) || 8))} />
                <div className="fieldHelper">Width of the caption box area (in pixels). This controls the total horizontal space the caption text can occupy.</div>

                <label style={{marginTop:8}}>Padding (px)</label>
                <input type="number" value={String(captions.padding)} onChange={e => setCaptionField('padding', Math.max(0, Number(e.target.value) || 0))} />
                <div className="fieldHelper">Visual spacing inside the caption box: increases the gap between the text and the box edges.</div>

                <div style={{marginTop:8}}>
                  <label><input type="checkbox" checked={captions.shrinkToFit} onChange={e => setCaptionField('shrinkToFit', e.target.checked)} /> Shrink text to fit box if needed</label>
                </div>

                <div style={{marginTop:8}}>
                  <label>Caption style</label>
                  <div>
                    <label><input type="radio" name="captionStyle" value="boxed" checked={(captions as any).style !== 'overlay'} onChange={() => setCaptionField('style' as any, 'boxed' as any)} /> Boxed (white box + border)</label>
                  </div>
                  <div>
                    <label><input type="radio" name="captionStyle" value="overlay" checked={(captions as any).style === 'overlay'} onChange={() => setCaptionField('style' as any, 'overlay' as any)} /> Overlay (no box or border)</label>
                  </div>
                </div>
              </div>

              {/* helper moved to persistent right-hand helper sidebar */}
            </div>
          </section>
        )}

        {page === 'system' && (
          <section>
            <h2>System</h2>
            <div className="advancedToggle settingRow">
              <label><input type="checkbox" checked={systemAdvanced} onChange={e => setSystemAdvanced(e.target.checked)} /> Enable advanced settings</label>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
              <div className={"advancedGroup " + (systemAdvanced ? '' : 'disabled')}>
                <h3>Storage</h3>
                <label>SD wait max attempts</label>
                <select title="SD wait max attempts" value={String(system.sdWaitMaxAttempts)} onChange={e => setSystemField('sdWaitMaxAttempts', Number(e.target.value)||0)}>
                  {[1,3,5,10,20].map(n => <option key={n} value={String(n)}>{String(n)}</option>)}
                </select>
                <div className="fieldHelper">How many attempts to wait for the SD card before giving up (recommended: {defaultSystem.sdWaitMaxAttempts}).</div>

                <label style={{marginTop:8}}>SD wait delay (ms)</label>
                <select title="SD wait delay (ms)" value={String(system.sdWaitDelayMs)} onChange={e => setSystemField('sdWaitDelayMs', Number(e.target.value)||0)}>
                  {[500,1000,1500,2000,3000,5000].map(n => <option key={n} value={String(n)}>{n} ms</option>)}
                </select>
                <div className="fieldHelper">Delay in milliseconds between SD wait attempts (recommended: {defaultSystem.sdWaitDelayMs}).</div>

                <div className="slideshowDivider" />

                <h3>Logging</h3>
                <label>Log rotation size (MB)</label>
                <div>
                  <select title="Log rotation size (MB)" value={String(Math.round((logging.logRotationSizeBytes||0) / (1024*1024)))} onChange={e => setLogField('logRotationSizeBytes', (Number(e.target.value)||0) * 1024 * 1024)}>
                    {[1,5,10,50,100,500].map(mb => (
                      <option key={mb} value={String(mb)}>{mb} MB</option>
                    ))}
                  </select>
                </div>

                <div className="fieldHelper">Maximum size before rotating logs. Shown in MB for convenience; stored in bytes (recommended: {Math.round(defaultLogging.logRotationSizeBytes / (1024*1024))} MB).</div>

                <label style={{marginTop:8}}>Log buffer lines</label>
                <select title="Log buffer lines" value={String(logging.logBufferLines)} onChange={e => setLogField('logBufferLines', Number(e.target.value)||0)}>
                  {[100,250,500,1000].map(n => <option key={n} value={String(n)}>{String(n)}</option>)}
                </select>
                <div className="fieldHelper">Number of log lines kept in memory before flushing/rotating (recommended: {defaultLogging.logBufferLines}).</div>

                <label style={{marginTop:8}}>Log rotation retention (files)</label>
                <select title="Log rotation retention" value={String(logging.logRotationRetention)} onChange={e => setLogField('logRotationRetention', Number(e.target.value)||0)}>
                  {[1,3,5,10].map(n => <option key={n} value={String(n)}>{String(n)}</option>)}
                </select>
                <div className="fieldHelper">How many rotated log files to keep (recommended: {defaultLogging.logRotationRetention}).</div>

                <div style={{marginTop:8}}>
                  <label><input title="Compress rotated logs" type="checkbox" checked={logging.logRotationCompress} onChange={e => setLogField('logRotationCompress', e.target.checked)} /> Compress rotated logs</label>
                  <div className="fieldHelper">When enabled, rotated logs will be compressed to save space.</div>
                </div>
              </div>

              {/* helper moved to persistent right-hand helper sidebar */}
            </div>
          </section>
        )}

        {page === 'schedule' && (
          <section>
            <h2>Schedule</h2>
            <div style={{marginTop:8}}>
              <label><input type="checkbox" checked={alwaysOn} onChange={e => setAlwaysOnToggle(e.target.checked)} /> Always on</label>
              <div className="fieldHelper">When enabled, the display will stay on continuously. Other schedule controls will be disabled.</div>
            </div>
            {/* rules removed per request */}
            <div className={"scheduleList " + (alwaysOn ? 'disabled' : '')}>
              {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d) => (
                <div key={d} className="scheduleDay">
                  <h4 className="scheduleDayTitle">{d}</h4>
                  {/* 'Copy from' moved below the Add button for better discoverability */}
                  <div>
                    {(schedule[d] || []).map((slot, idx) => (
                      <div key={idx} className="slotRow">
                        <label className="timeLabel">On
                          <select aria-label={`On time ${d} #${idx}`} value={slot.on || ''} onChange={e => setSlot(d, idx, 'on', e.target.value)} disabled={alwaysOn}>
                            <option value="">--</option>
                            {Array.from({length: 24*12}).map((_, i) => {
                              const mins = i*5
                              const t = minutesToTime(mins)
                              return <option key={t} value={t}>{t}</option>
                            })}
                          </select>
                        </label>
                        <label className="timeLabel">Off  
                          <select aria-label={`Off time ${d} #${idx}`} value={(() => {
                            // Display logic: show 24:00 if stored as 00:00 and ON time is late (after 22:00)
                            const offValue = slot.off || ''
                            const onValue = slot.on
                            if (offValue === '00:00' && onValue && timeToMinutes(onValue) >= 22*60) {
                              return '24:00'
                            }
                            return offValue
                          })()} onChange={e => setSlot(d, idx, 'off', e.target.value)} disabled={alwaysOn}>
                            <option value="">--</option>
                            {(() => {
                              const onTime = slot.on
                              const options = []

                              if (onTime) {
                                const onMins = timeToMinutes(onTime)

                                // Add same-day times after ON time (no cross-midnight to avoid conflicts)
                                for (let i = 0; i < 24*12; i++) {
                                  const mins = i*5
                                  const t = minutesToTime(mins)

                                  // Only show times after ON time on the same day
                                  if (mins > onMins) {
                                    options.push(<option key={t} value={t}>{t}</option>)
                                  }
                                }

                                // Add 24:00 as end-of-day option (append last)
                                options.push(<option key="24:00" value="24:00">24:00 (midnight)</option>)
                              } else {
                                // No ON time set, show all times then append 24:00 last
                                for (let i = 0; i < 24*12; i++) {
                                  const mins = i*5
                                  const t = minutesToTime(mins)
                                  options.push(<option key={t} value={t}>{t}</option>)
                                }
                                options.push(<option key="24:00" value="24:00">24:00 (midnight)</option>)
                              }

                              return options
                            })()}
                          </select>
                        </label>
                        <button className="danger" onClick={() => removeSlot(d, idx)} disabled={alwaysOn}>Remove</button>
                      </div>
                    ))}
                    <div className="addRow">
                      {/* Always show the Add button so it remains discoverable; disable it when the latest line is blank.
                          This prevents piling up multiple empty rows while keeping the control visible. */}
                      {(() => {
                        const daySlots = schedule[d] || []
                        const last = daySlots.length ? daySlots[daySlots.length-1] : null
                        const lastIsBlank = !!(last && !last.on && !last.off)
                        return (
                          <button
                            className="primary"
                            onClick={() => addSlot(d)}
                            disabled={alwaysOn || lastIsBlank}
                            title={alwaysOn ? 'Schedule disabled while Always on is enabled' : lastIsBlank ? 'Complete the previous empty slot before adding another.' : 'Add a new schedule row'}
                          >
                            Add
                          </button>
                        )
                      })()}
                    </div>

                    <div className="scheduleDayBody copyFromBelow">
                      <label className="smallLabel">Copy from:
                        <select aria-label={`Copy to ${d}`} defaultValue="" onChange={e => { const src = e.target.value; if (src) { copyDay(d, src); e.currentTarget.value = ''; } }} disabled={alwaysOn}>
                          <option value="">--</option>
                          {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].filter(x => x !== d).map(x => (
                            <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
  {/* persistent right-hand helper sidebar (mirrors left menu styling)
      Hidden on EO2 Setup pages so the centre panel contains all setup text */}
  {page !== 'eo2setup' && (
    <aside className="helperSidebar">{helperContent()}</aside>
  )}
  {/* Confirm modal used instead of native confirm() */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Reset"
        cancelText="Cancel"
        danger={true}
        onConfirm={doConfirmedReset}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Confirm modal for save confirmation when required fields are missing */}
      <ConfirmModal
        open={confirmSaveOpen}
        title={"Missing required fields"}
        message={confirmSaveMessage}
        confirmText={"Save anyway"}
        cancelText={"Cancel"}
        danger={false}
        onConfirm={doConfirmedSave}
        onCancel={() => setConfirmSaveOpen(false)}
      />
    </div>
  )
}
