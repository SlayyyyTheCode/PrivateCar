# Publishing OYC to Google Play

Cost: **US$25, one time.** No Mac required. Everything below runs from Windows.

## 1. One-time accounts

1. Create a Google Play Console developer account at <https://play.google.com/console/signup> (US$25). Identity verification usually takes 1–3 days, so start here.
2. Create a free Expo account at <https://expo.dev/signup>.
3. Install the CLI and sign in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

## 2. Link the project to EAS

```bash
eas init
```

This writes an `extra.eas.projectId` into `app.json`. Commit that change.

## 3. Build a test APK first

```bash
eas build --platform android --profile preview
```

EAS builds in the cloud and gives you a download link for an installable `.apk`. Put it on your own phone and check every tab before going further.

## 4. Build the release bundle

```bash
eas build --platform android --profile production
```

This produces an `.aab` (Android App Bundle), which is what Play Store requires. EAS generates and stores the signing keystore for you — let it, and do not lose access to your Expo account.

## 5. Create the Play Console listing

In the Play Console, create an app named **OYC — Own Your Car**, then fill in:

- **Short description** (80 chars max): *What a car in Singapore really costs, before you sign anything.*
- **Full description**: adapt the README's "Why it exists" and "What it calculates" sections.
- **App icon**: 512×512 PNG.
- **Feature graphic**: 1024×500 PNG.
- **Screenshots**: at least 2 phone screenshots. Take them from Expo Go on a real device — the Verdict tab and the True cost tab are the most persuasive.
- **Category**: Finance.
- **Content rating**: complete the questionnaire; OYC is Everyone.

## 6. Data safety declaration

This is the section people get wrong. OYC's answers are straightforward because the app genuinely collects nothing:

- Does your app collect or share any of the required user data types? **No.**
- Is all of the user data encrypted in transit? Not applicable — no data is transmitted.
- Do you provide a way for users to request that their data is deleted? Not applicable — data never leaves the device. Users can clear it with the app's Reset button or by uninstalling.

Everything the user types is held in `AsyncStorage` on their own phone and is never sent anywhere.

## 7. Privacy policy

Play Store requires a reachable privacy policy URL even for apps that collect nothing. The simplest route is a GitHub Pages page on this repo stating that OYC stores all input locally on the device, transmits nothing, contains no analytics or advertising, and requires no account.

## 8. Submit

```bash
eas submit --platform android --profile production
```

Or upload the `.aab` by hand under **Production → Create new release**. First reviews typically take a few days.

## Updating later

Bump the version in `app.json`, rebuild with the production profile, and submit again. `autoIncrement` in `eas.json` handles the Android version code for you.
