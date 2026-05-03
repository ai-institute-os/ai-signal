export default function TilmeldtPage() {
  return (
    <div className="min-h-screen bg-[#060D1A] flex items-center justify-center px-5 py-10 font-sans">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#00D4FF] to-[#0099BB]">
            <span className="text-[#0A1628] font-extrabold text-[13px]">AI</span>
          </div>
          <span className="text-white font-bold text-[17px] tracking-tight">InsideAI</span>
        </div>

        {/* Card */}
        <div className="bg-[#0A1628] border border-[rgba(0,212,255,0.15)] rounded-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-[#00D4FF] via-[#0099BB] to-transparent" />

          <div className="px-10 pt-10 pb-9">
            {/* Checkmark icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-center text-[22px] font-extrabold text-[#F0F6FF] tracking-tight leading-tight mb-3">
              Du er tilmeldt InsideAI
            </h1>

            {/* Subtext */}
            <p className="text-center text-[14px] text-[#94A3B8] leading-relaxed mb-7">
              Du modtager snart din velkomst-email med din første AI-indsigt.
            </p>

            {/* What is InsideAI block */}
            <div className="bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)] rounded-xl px-5 py-4 mb-8">
              <p className="text-[11px] font-semibold text-[#00D4FF] uppercase tracking-[0.7px] mb-1.5">
                Hvad er InsideAI?
              </p>
              <p className="text-[13px] text-[#94A3B8] leading-relaxed m-0">
                InsideAI leverer ugentlige indsigter om, hvad kunstig intelligens siger om din
                branche og dine konkurrenter — direkte i din indbakke, uden login.
              </p>
            </div>

            {/* CTA */}
            <a
              href="https://aiscore.dk"
              className="block text-center text-[14px] font-semibold text-[#00D4FF] bg-[#0A1628] border border-[rgba(0,212,255,0.35)] rounded-lg py-3 px-6 no-underline hover:bg-[rgba(0,212,255,0.08)] transition-colors"
            >
              Besøg aiscore.dk →
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-[#2A3F5A]">
          © 2026 InsideAI · AI-synlighedsmonitorering
        </p>
      </div>
    </div>
  );
}
