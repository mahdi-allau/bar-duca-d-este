import Experiences from "@/components/Experiences";
import Hero from "@/components/Hero";
import Location from "@/components/Location";
import Reviews from "@/components/Reviews";
import { getDict, langOf } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ lang: string }> };

export const generateMetadata = async ({ params }: Props) => pageMetadata("home", "/", await langOf(params));

export default async function Home({ params }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  return (
    <>
      <Hero t={d.home} common={d.common} lang={lang} />
      <Experiences lang={lang} />
      <Location lang={lang} />
      <Reviews lang={lang} />
    </>
  );
}
