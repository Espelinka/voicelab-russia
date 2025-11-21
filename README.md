<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VoiceLab Russia - Secure Deployment

This contains everything you need to run your app locally and deploy securely to Vercel.

View your app in AI Studio: https://ai.studio/apps/drive/1HcEdrmqTwDU0ZZKkKVahjnZuN1mixuI3

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your Gemini API key as an environment variable in Vercel:
   - Name: `GEMINI_API_KEY`
   - Value: Your actual Gemini API key from https://aistudio.google.com/app/apikey
4. Deploy your application

The API key is now securely stored on Vercel and not exposed in the client-side code.

## Recent Improvements

- **Enhanced Security**: API keys are stored securely on Vercel, not in client code
- **Caching**: Frequently requested texts are cached to reduce API calls and improve response times
- **Rate Limiting**: Server-side rate limiting prevents abuse of your API key
- **Improved Progress Reporting**: More detailed progress updates during audio generation
- **Input Validation**: Enhanced validation to prevent extremely large text submissions
- **Centralized Configuration**: All settings are now managed in a single config file
- **Better Error Handling**: Standardized error handling with consistent error messages