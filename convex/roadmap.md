You're absolutely right! Let me give you a **battle-tested, feature-complete** structure that matches or exceeds what top URL shorteners offer (Bitly, Short.io, Rebrandly, Dub.sh).

## Complete Feature-Proof Link Mapping Structure

```typescript
interface LinkMapping {
  // ═══════════════════════════════════════════════════════════
  // CORE (Required)
  // ═══════════════════════════════════════════════════════════
  destination: string; // Final URL
  tenant_id: string; // Owner (org_42 or user_123)
  redirect_type: 301 | 302 | 307 | 308;
  link_id: string; // Convex document ID

  // ═══════════════════════════════════════════════════════════
  // METADATA (Tracking & Audit)
  // ═══════════════════════════════════════════════════════════
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  created_by: string; // User ID who created
  last_edited_by?: string; // User ID who last edited

  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  is_active: boolean; // Can be paused without deleting
  is_deleted: boolean; // Soft delete
  expires_at: number | null; // Auto-expire links
  expired_redirect?: string; // Where to redirect after expiry
  archived_at: number | null; // Archive old links

  // ═══════════════════════════════════════════════════════════
  // CLICK LIMITS (Bitly has this, very useful for campaigns)
  // ═══════════════════════════════════════════════════════════
  max_clicks: number | null; // Stop after N clicks
  max_clicks_action: "disable" | "redirect" | "show_message";
  max_clicks_redirect?: string; // Redirect after limit hit
  max_clicks_message?: string; // Custom message after limit
  click_count_key: string; // Redis key: clicks:${slug}

  // ═══════════════════════════════════════════════════════════
  // A/B TESTING (Advanced feature - Dub.sh and Bitly offer this)
  // ═══════════════════════════════════════════════════════════
  ab_test: {
    enabled: boolean;
    variants: Array<{
      id: string; // "control", "variant_b"
      name: string; // "Original Landing Page"
      destination: string; // URL for this variant
      weight: number; // 0-100 (must sum to 100)
      description?: string;
    }>;
    distribution_method: "weighted_random" | "deterministic";
    track_conversions: boolean;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // GEOGRAPHIC ROUTING (Short.io, Rebrandly have this)
  // ═══════════════════════════════════════════════════════════
  geo_targeting: {
    enabled: boolean;
    rules: Record<string, string>; // {"US": "url", "GB": "url", "default": "url"}
    fallback: string; // If country not in rules
  } | null;

  // ═══════════════════════════════════════════════════════════
  // DEVICE TARGETING (Mobile vs Desktop - Bitly, Short.io)
  // ═══════════════════════════════════════════════════════════
  device_targeting: {
    enabled: boolean;
    rules: {
      mobile?: string; // iOS + Android
      ios?: string; // iOS specific
      android?: string; // Android specific
      desktop?: string;
      tablet?: string;
    };
    fallback: string;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // LANGUAGE/LOCALE TARGETING (Rare but powerful)
  // ═══════════════════════════════════════════════════════════
  locale_targeting: {
    enabled: boolean;
    rules: Record<string, string>; // {"en": "url", "es": "url", "fr": "url"}
    fallback: string;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // TIME-BASED RULES (Schedule links - few competitors have this!)
  // ═══════════════════════════════════════════════════════════
  schedule: {
    enabled: boolean;
    timezone: string; // "America/New_York"
    rules: Array<{
      days: number[]; // [0=Sun, 1=Mon, ..., 6=Sat]
      start_time: string; // "09:00"
      end_time: string; // "17:00"
      destination: string; // Business hours URL
    }>;
    outside_schedule_action: "disable" | "redirect" | "show_message";
    outside_schedule_redirect?: string;
    outside_schedule_message?: string;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // SECURITY & ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════
  security: {
    password_protected: boolean;
    password_hash?: string; // bcrypt hash
    password_hint?: string;

    ip_whitelist?: string[]; // Only these IPs can access
    ip_blacklist?: string[]; // Block these IPs

    domain_whitelist?: string[]; // Allowed referrer domains
    block_bots: boolean; // Block known bots/scrapers

    require_captcha: boolean; // Show captcha before redirect
    captcha_provider?: "turnstile" | "recaptcha";

    rate_limit_per_ip: number | null; // Max clicks per IP per hour
  };

  // ═══════════════════════════════════════════════════════════
  // UTM & CAMPAIGN TRACKING (Auto-append UTM params)
  // ═══════════════════════════════════════════════════════════
  utm_builder: {
    enabled: boolean;
    params: {
      source?: string; // utm_source=newsletter
      medium?: string; // utm_medium=email
      campaign?: string; // utm_campaign=spring-sale
      term?: string;
      content?: string;
    };
    override_existing: boolean; // Replace existing UTM params
  } | null;

  // ═══════════════════════════════════════════════════════════
  // CUSTOM QUERY PARAMS (Pass-through or inject)
  // ═══════════════════════════════════════════════════════════
  query_params: {
    pass_through: boolean; // Keep original query params
    inject: Record<string, string>; // Add custom params
    remove?: string[]; // Remove specific params (e.g., ["fbclid"])
  } | null;

  // ═══════════════════════════════════════════════════════════
  // CONVERSION TRACKING (Pixel tracking - Bitly has this)
  // ═══════════════════════════════════════════════════════════
  conversion_tracking: {
    enabled: boolean;
    pixels: Array<{
      provider:
        | "facebook"
        | "google"
        | "twitter"
        | "linkedin"
        | "tiktok"
        | "custom";
      pixel_id: string;
      event_name?: string; // "Purchase", "Lead", etc.
    }>;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // LINK PREVIEW / OG TAGS (Custom social preview - Dub.sh)
  // ═══════════════════════════════════════════════════════════
  og_tags: {
    enabled: boolean;
    title?: string; // Custom og:title
    description?: string; // Custom og:description
    image?: string; // Custom og:image URL
    video?: string; // og:video
    type?: string; // og:type (article, video, etc.)
  } | null;

  // ═══════════════════════════════════════════════════════════
  // LINK PREVIEW PAGE (Interstitial page before redirect)
  // ═══════════════════════════════════════════════════════════
  preview_page: {
    enabled: boolean;
    show_timer: boolean; // "Redirecting in 5 seconds..."
    timer_seconds: number;
    custom_message?: string;
    show_destination: boolean; // Show where link goes
    branding_logo?: string; // Your logo
    continue_button_text: string; // "Continue to destination"
  } | null;

  // ═══════════════════════════════════════════════════════════
  // CLOAKING (Hide affiliate links - popular feature)
  // ═══════════════════════════════════════════════════════════
  cloaking: {
    enabled: boolean;
    show_destination_in_preview: boolean;
    hide_from_search_engines: boolean; // noindex, nofollow
  };

  // ═══════════════════════════════════════════════════════════
  // DEEP LINKING (Mobile app deep links - Bitly, Branch.io)
  // ═══════════════════════════════════════════════════════════
  deep_linking: {
    enabled: boolean;
    ios_url?: string; // myapp://path
    ios_app_store_url?: string; // Fallback if app not installed
    android_url?: string; // intent://path
    android_play_store_url?: string;
    desktop_fallback: string;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // QR CODE CONFIG (Generate QR codes - Bitly, Dub.sh)
  // ═══════════════════════════════════════════════════════════
  qr_code: {
    enabled: boolean;
    style: "default" | "rounded" | "dots";
    color: string; // Hex color
    background: string;
    logo_url?: string; // Center logo
    size: number; // Pixels
  } | null;

  // ═══════════════════════════════════════════════════════════
  // TAGS & ORGANIZATION
  // ═══════════════════════════════════════════════════════════
  tags: string[]; // ["email", "campaign-2025", "promo"]
  folder_id?: string; // Organize in folders
  workspace_id?: string; // For team workspaces

  // ═══════════════════════════════════════════════════════════
  // CUSTOM METADATA (User-defined fields)
  // ═══════════════════════════════════════════════════════════
  custom_fields: Record<string, string | number | boolean>;

  // ═══════════════════════════════════════════════════════════
  // NOTES & DESCRIPTION
  // ═══════════════════════════════════════════════════════════
  title?: string; // Human-readable name
  description?: string; // Internal notes
  notes?: string; // Private notes

  // ═══════════════════════════════════════════════════════════
  // ANALYTICS CONFIG
  // ═══════════════════════════════════════════════════════════
  analytics: {
    track_clicks: boolean;
    track_unique_clicks: boolean; // Dedupe by IP
    track_conversions: boolean;
    track_referrers: boolean;
    track_devices: boolean;
    track_locations: boolean;
    exclude_bots: boolean;
    exclude_internal_traffic: boolean;
  };

  // ═══════════════════════════════════════════════════════════
  // WEBHOOKS (Trigger on click - powerful automation)
  // ═══════════════════════════════════════════════════════════
  webhooks: Array<{
    url: string;
    events: ("click" | "conversion" | "limit_reached" | "expired")[];
    secret: string; // For signature verification
    enabled: boolean;
  }>;

  // ═══════════════════════════════════════════════════════════
  // RETARGETING PIXELS (Load pixels on click - Bitly feature)
  // ═══════════════════════════════════════════════════════════
  retargeting_pixels: Array<{
    provider: "facebook" | "google" | "twitter" | "linkedin" | "custom";
    pixel_id: string;
    fire_on_click: boolean;
    fire_on_preview: boolean;
  }>;

  // ═══════════════════════════════════════════════════════════
  // SPLIT TESTING METRICS (Track which variant performs better)
  // ═══════════════════════════════════════════════════════════
  split_test_goal?: {
    metric: "clicks" | "conversions" | "time_on_site";
    target_conversions?: number;
    auto_select_winner: boolean;
    winner_threshold: number; // % difference to declare winner
  };

  // ═══════════════════════════════════════════════════════════
  // BROWSER NOTIFICATIONS (Ask permission on click)
  // ═══════════════════════════════════════════════════════════
  browser_notifications: {
    enabled: boolean;
    prompt_message: string;
    vapid_public_key?: string;
  } | null;

  // ═══════════════════════════════════════════════════════════
  // EDGE CACHING
  // ═══════════════════════════════════════════════════════════
  cache: {
    ttl: number; // Seconds to cache at edge
    vary_by_country: boolean;
    vary_by_device: boolean;
  };

  // ═══════════════════════════════════════════════════════════
  // INTEGRITY & VERSIONING
  // ═══════════════════════════════════════════════════════════
  version: number; // Schema version for migrations
  hmac?: string; // Signature to prevent tampering
  checksum?: string; // MD5/SHA for integrity checks
}
```

## Size Estimate

```typescript
// Minimal config (just redirects): ~600 bytes
// With A/B testing + geo targeting: ~2 KB
// Full-featured (all options enabled): ~8-12 KB
// With all arrays maxed out: ~50 KB (edge case)
```

## Features Your Competitors DON'T Have (Competitive Advantages)

### 1. **Time-Based Routing** ⭐ (Almost nobody has this)

```typescript
schedule: {
  enabled: true,
  timezone: "America/New_York",
  rules: [{
    days: [1, 2, 3, 4, 5],  // Mon-Fri
    start_time: "09:00",
    end_time: "17:00",
    destination: "https://business-hours.com"
  }],
  outside_schedule_redirect: "https://after-hours.com"
}
// Use case: Support links that go to chat during business hours,
// contact form outside business hours
```

### 2. **Multi-Level Device Targeting** ⭐ (Most only do mobile/desktop)

```typescript
device_targeting: {
  enabled: true,
  rules: {
    ios: "https://apps.apple.com/...",
    android: "https://play.google.com/...",
    tablet: "https://tablet-optimized.com",
    desktop: "https://desktop.com"
  }
}
// Competitors: Usually just mobile vs desktop
```

### 3. **Locale/Language Targeting** ⭐ (Rare feature)

```typescript
locale_targeting: {
  enabled: true,
  rules: {
    "en": "https://english.com",
    "es": "https://spanish.com",
    "fr": "https://french.com",
    "zh": "https://chinese.com"
  },
  fallback: "https://english.com"
}
// Detect browser language, route accordingly
```

### 4. **Query Param Injection + Removal** ⭐

```typescript
query_params: {
  pass_through: true,
  inject: {
    "referral_code": "ABC123",
    "promo": "SPRING2025"
  },
  remove: ["fbclid", "gclid", "utm_*"]  // Clean tracking params
}
// Bitly doesn't have "remove" - you do!
```

### 5. **Webhook Triggers on Events** ⭐⭐ (Game changer)

```typescript
webhooks: [
  {
    url: "https://your-api.com/webhook",
    events: ["click", "conversion", "limit_reached"],
    secret: "whsec_...",
    enabled: true,
  },
];
// Trigger Zapier, n8n, Make.com workflows
// Most competitors: No webhook support
```

### 6. **Automatic A/B Test Winner Selection** ⭐⭐

```typescript
split_test_goal: {
  metric: "conversions",
  auto_select_winner: true,
  winner_threshold: 10  // 10% performance difference
}
// After enough data, automatically route 100% to winner
// Competitors: You manually check results
```

### 7. **Per-IP Rate Limiting** ⭐

```typescript
security: {
  rate_limit_per_ip: 10; // Max 10 clicks per hour per IP
}
// Prevent scraping/abuse
// Most shorteners: Global rate limits only
```

### 8. **Retargeting Pixel Loading** ⭐⭐

```typescript
retargeting_pixels: [
  {
    provider: "facebook",
    pixel_id: "123456789",
    fire_on_click: true,
    fire_on_preview: false,
  },
];
// Build remarketing audiences from clicks
// Bitly has this, but most don't
```

## Feature Comparison Matrix

| Feature                   | Your Platform | Bitly        | Dub.sh | Short.io | Rebrandly |
| ------------------------- | ------------- | ------------ | ------ | -------- | --------- |
| A/B Testing               | ✅            | ✅           | ✅     | ❌       | ❌        |
| Geo Targeting             | ✅            | ✅           | ✅     | ✅       | ✅        |
| Device Targeting          | ✅ (4 types)  | ✅ (2 types) | ❌     | ✅       | ❌        |
| **Time-Based Rules**      | ✅            | ❌           | ❌     | ❌       | ❌        |
| **Locale Targeting**      | ✅            | ❌           | ❌     | ❌       | ❌        |
| Password Protection       | ✅            | ✅           | ✅     | ✅       | ✅        |
| Click Limits              | ✅            | ✅           | ❌     | ✅       | ❌        |
| **Webhooks**              | ✅            | ❌           | ❌     | ❌       | ❌        |
| QR Codes                  | ✅            | ✅           | ✅     | ✅       | ✅        |
| Custom OG Tags            | ✅            | ✅           | ✅     | ❌       | ❌        |
| Deep Linking              | ✅            | ✅           | ❌     | ✅       | ❌        |
| **Auto Winner Selection** | ✅            | ❌           | ❌     | ❌       | ❌        |
| **Query Param Removal**   | ✅            | ❌           | ❌     | ❌       | ❌        |
| Retargeting Pixels        | ✅            | ✅           | ❌     | ❌       | ❌        |
| **Per-IP Rate Limit**     | ✅            | ❌           | ❌     | ❌       | ❌        |
| Link Expiry               | ✅            | ✅           | ✅     | ✅       | ✅        |

## Practical Implementation - Phased Approach

### Phase 1: MVP (Launch quickly)

```typescript
{
  destination, tenant_id, redirect_type, created_at, link_id,
  is_active, tags, analytics: { track_clicks: true }
}
```

### Phase 2: Core Features (Month 1-2)

```typescript
+ ab_test (A/B testing)
+ geo_targeting (Geographic routing)
+ device_targeting (Mobile/desktop)
+ expires_at + max_clicks (Limits)
+ utm_builder (UTM auto-append)
+ og_tags (Social previews)
```

### Phase 3: Advanced (Month 3-4)

```typescript
+ security (Password, IP whitelist/blacklist)
+ schedule (Time-based routing) ← Competitive advantage
+ locale_targeting ← Competitive advantage
+ webhooks ← Competitive advantage
+ deep_linking (Mobile apps)
+ query_params (Inject/remove)
```

### Phase 4: Pro Features (Month 5-6)

```typescript
+ conversion_tracking (Pixels)
+ retargeting_pixels
+ preview_page (Interstitial)
+ split_test_goal (Auto-winner)
+ qr_code (Custom QR generation)
```

## Storage Strategy for Large Objects

```typescript
// Base mapping in Redis (fast read): 2-3 KB
const baseMapping = {
  destination, tenant_id, redirect_type, link_id,
  is_active, expires_at, max_clicks,
  // Reference to extended config
  has_extended_config: true
}

// Extended config in separate key (lazy load): 5-10 KB
const extendedConfig = {
  ab_test, geo_targeting, device_targeting,
  schedule, webhooks, retargeting_pixels, etc.
}

// Worker logic:
const base = await redis.get(`slug:${slug}`)
if (needsExtendedConfig(base)) {
  const extended = await redis.get(`slug:${slug}:extended`)
  // Merge configs
}
```

## My Strong Recommendation

Start with this **balanced structure** (~2 KB):

```typescript
interface PracticalLinkMapping {
  // Core
  destination: string;
  tenant_id: string;
  redirect_type: 302;
  link_id: string;
  created_at: number;
  updated_at: number;

  // State
  is_active: boolean;
  expires_at: number | null;
  max_clicks: number | null;

  // Features (most common)
  ab_test: ABTest | null;
  geo_targeting: GeoRules | null;
  device_targeting: DeviceRules | null;
  utm_builder: UTMConfig | null;

  // Security basics
  security: {
    password_protected: boolean;
    password_hash?: string;
    block_bots: boolean;
  };

  // Analytics
  analytics: {
    track_clicks: boolean;
    track_unique_clicks: boolean;
    exclude_bots: boolean;
  };

  // Organization
  tags: string[];
  title?: string;
  description?: string;

  // Metadata
  version: 1;
}
```

Then add advanced features (schedule, webhooks, retargeting) as separate keys when needed:

```typescript
// Most links: Just base config (2 KB)
redis.set(`slug:abc`, baseMapping);

// Power users: Extended features (additional 5-10 KB)
redis.set(`slug:abc:extended`, {
  schedule,
  webhooks,
  retargeting_pixels,
  deep_linking,
});
```

c
