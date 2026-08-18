# Publishing OYC to the App Store

Cost: **US$99 per year.** **No Mac required** — EAS builds and signs iOS binaries in the cloud from Windows.

## 1. One-time accounts

1. Enrol in the Apple Developer Program at <https://developer.apple.com/programs/> (US$99/year). Enrolment can take several days, so start here.
2. Create a free Expo account at <https://expo.dev/signup>.
3. Install the CLI and sign in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

## 2. Register the app with Apple

In App Store Connect, create a new app:

- **Bundle ID**: `sg.oyc.app` (matches `app.json`; register it first under Certificates, Identifiers & Profiles)
- **Name**: OYC — Own Your Car
- **Primary language**: English (Singapore) or English (U.K.)
- **SKU**: anything unique, e.g. `oyc-001`

## 3. Link the project to EAS

```bash
eas init
```

Commit the `extra.eas.projectId` this adds to `app.json`.

## 4. Build

```bash
eas build --platform ios --profile production
```

EAS will ask for your Apple credentials and then create the distribution certificate and provisioning profile for you. Let it manage credentials unless you have a reason not to.

## 5. TestFlight before the store

```bash
eas submit --platform ios --profile production
```

The build lands in TestFlight. Install it on your own device and walk every tab before you submit for review. Apple rejects finance apps that show broken or placeholder numbers.

## 6. App Store listing

- **Subtitle** (30 chars): *Singapore car affordability*
- **Description**: adapt the README's "Why it exists" and "What it calculates" sections.
- **Keywords**: car, COE, Singapore, loan, affordability, budget, ARF, road tax
- **Screenshots**: required for 6.7" and 6.5" iPhone. Take them in Expo Go on a real device, or use the simulator screenshots EAS can produce.
- **Category**: Finance
- **Age rating**: 4+

## 7. App Privacy

Under **App Privacy**, answer **"Data Not Collected."** OYC holds everything the user types in `AsyncStorage` on the device, transmits nothing, and has no analytics, advertising or account system.

You still need a privacy policy URL. A GitHub Pages page on this repo stating the above is sufficient.

## 8. Export compliance

`app.json` already sets `ITSAppUsesNonExemptEncryption: false`, so App Store Connect will not ask about encryption on every upload. This is accurate — the app makes no network requests at all.

## 9. Review notes

Apple reviewers sometimes flag finance apps for unsubstantiated claims. Add a review note along these lines:

> OYC is an offline calculator. It requires no account and makes no network requests. All figures shown are user-editable defaults sourced from LTA, HDB, CPF Board and Singapore consumer finance publications, with sources and an "as of" date shown in the app's Learn tab. The app displays a disclaimer that it provides estimates for planning and is not financial advice.

## Updating later

Bump the version in `app.json`, rebuild with the production profile, and submit again. `autoIncrement` in `eas.json` handles the iOS build number.
