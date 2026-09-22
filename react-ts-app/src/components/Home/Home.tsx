import type { HomePageSection } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';
import './Home.css';

const MOCK_SECTIONS: HomePageSection[] = [
  {
    kind: 'loanCalculatorBlock',
    props: {
      imageUrl: 'https://placehold.co/500x600/png?text=Person',
    },
  },
];

export function Home() {
  return (
    <div id="page">
      <div id="content">
        <main>{MOCK_SECTIONS.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
