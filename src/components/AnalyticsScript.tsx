import Script from "next/script";

const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;

export default function AnalyticsScript() {
  if (!analyticsId) return null;

  if (analyticsId.startsWith("G-")) {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}');`}
        </Script>
      </>
    );
  }

  return (
    <Script
      defer
      data-domain={analyticsId}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
