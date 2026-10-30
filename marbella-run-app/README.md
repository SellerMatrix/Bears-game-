# Marbella Run: iOS and Android app

This folder wraps the web game in `../marbella-run/` as native apps using [Capacitor](https://capacitorjs.com). The game itself is not copied by hand: `npm run sync` copies it into `www/` and then into the native projects.

## Build for iPhone and iPad (needs a Mac)
1. Install Xcode 16 or newer and Node 22.
2. In this folder: `npm install`, then `npm run ios`. This syncs the game and opens Xcode.
3. In Xcode, select the **App** target → **Signing & Capabilities** → choose your Apple Developer team. Change the bundle identifier if `com.sellermatrix.marbellarun` is not yours.
4. Choose **Any iOS Device**, then **Product → Archive**, then **Distribute App → App Store Connect**.
5. In App Store Connect, fill in the listing from `store/listing.md`, upload the screenshots from `store/screenshots/`, set the price, and submit for review.

## Build for Android
1. Install Android Studio and Node 22.
2. `npm install`, then `npm run android`.
3. **Build → Generate Signed App Bundle** and upload the `.aab` to Google Play Console.

## After changing the game
Run `npm run sync` again before building. Bump the version in Xcode (Version / Build) and in `android/app/build.gradle` (`versionName` / `versionCode`) for each store upload.

## What is already set up
- Full screen with the status bar hidden, all orientations, screen kept awake while the app is open.
- App icons and launch screens generated from `assets/` (`npm run assets` to regenerate).
- Export compliance answered (no encryption), game-controller support declared, Racing category set.
- No permissions requested, nothing collected (the App Privacy answer is "Data Not Collected").
