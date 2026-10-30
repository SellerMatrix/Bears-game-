# Publishing Captain Bear 2 on the App Store

Everything in this folder is ready. The last steps need a Mac and an Apple account, so they're yours.

## What you need
- A Mac with **Xcode 16 or newer** (free from the Mac App Store)
- **Node.js 20+** on the Mac (https://nodejs.org)
- An **Apple Developer Program** membership (£79/year in the UK) — https://developer.apple.com/programs/
- Your **support email** (put it in `support.html`, replacing `SUPPORT_EMAIL_HERE`)

## 1. Get the project onto the Mac
```bash
git clone https://github.com/SellerMatrix/Bears-game-.git
cd Bears-game-
git checkout claude/toad-commander-keen-game-uvzbh6
cd app
npm install
npm run sync      # rebuilds www/ from ../captain-bear-2.html and copies it into the iOS project
npm run open      # opens Xcode
```

## 2. Set your identity in Xcode
1. Click **App** in the left sidebar → **Signing & Capabilities**.
2. Tick **Automatically manage signing** and choose your **Team**.
3. The bundle identifier is `com.sellermatrix.captainbear2`. Change it if you want; it must be unique and match App Store Connect. (If you change it, also change `appId` in `capacitor.config.json`.)
4. **General** tab: Version `1.0.0`, Build `1`.

## 3. Try it on your phone first
Plug in your iPhone, pick it at the top of Xcode, press ▶. Play a couple of worlds, check sound with the silent switch on and off, and rotate the phone.

## 4. Create the app in App Store Connect
https://appstoreconnect.apple.com → **Apps** → **+** → New App
- Platform iOS, name **Captain Bear 2: Four Seasons**, language English (UK), the bundle ID from step 2, SKU `captainbear2`.
- Fill in the listing from `STORE_LISTING.md`.
- Upload the screenshots from `app/screenshots/` (6.9" iPhone and 13" iPad folders).
- **Pricing and Availability** → choose the £2.99 price.
- **App Privacy** → "Data Not Collected".
- Host `privacy.html` and `support.html` (they deploy with the Netlify site) and paste their URLs.

## 5. Upload a build
In Xcode: set the device to **Any iOS Device (arm64)** → **Product → Archive** → **Distribute App → App Store Connect → Upload**. Wait ~15 minutes, then pick the build in App Store Connect and **Submit for Review**. Reviews usually take 1–2 days.

## When you change the game later
Edit `captain-bear-2.html` at the repo root, then on the Mac run `npm run sync` in `app/`, bump the Build number in Xcode, and archive again.

## Notes
- The game is fully offline: three.js, the post-processing scripts and the Fredoka font are bundled in `www/` by `scripts/build-www.mjs`. The build refuses to run if anything still points at the internet.
- Encryption: `ITSAppUsesNonExemptEncryption` is already set to `NO`, so you won't be asked about export compliance.
- The app is full-screen and supports portrait and landscape on iPhone and iPad.
- The name "Captain Bear" is original, but the game is clearly inspired by Nintendo's Captain Toad. Don't mention Nintendo or Toad anywhere in the listing or keywords.
