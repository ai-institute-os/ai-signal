import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getNextUpsellRecommendation } from '@/lib/db';

// Returns next upsell recommendation for a company.
// Rotation logic:
//   - Has AIScore purchased → always recommend AISelect
//   - No AIScore: positions 0-4 in 10-cycle → AIScore, positions 5-9 → AISelect (then loops)
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
  }

  const company = getCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
  }

  const { recommendation, count } = getNextUpsellRecommendation(companyId);

  const content =
    recommendation === 'aiscore'
      ? {
          product: 'AIScore',
          headline: 'Forstå din AI-position i dybden',
          body: 'AIScore er en strategisk engangssanalyse der viser præcis hvordan AI-systemer opfatter, beskriver og vælger din virksomhed — og hvad der skal til for at du vælges frem for konkurrenterne.',
          cta: 'Læs mere om AIScore',
          color: 'pink',
        }
      : {
          product: 'AISelect',
          headline: 'Bevar og styrk din AI-position løbende',
          body: 'AISelect er et løbende retainer-system der sikrer at dine ændringer ikke skader din AI-position — og at forbedringer sker kontrolleret. Eksperter beskytter din valgbarhed over tid.',
          cta: 'Læs mere om AISelect',
          color: 'blue',
        };

  return NextResponse.json({
    recommendation,
    count,
    hasPurchasedAIScore: company.products_purchased.includes('aiscore'),
    ...content,
  });
}
