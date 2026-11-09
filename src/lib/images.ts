/**
 * Every photograph on the site is declared here. The originals live in
 * /public/foto; files named dettaglio-* are close-up crops of those originals.
 * To change a photo, drop the new file in /public/foto and update `src`.
 */
export type Photo = { src: string; alt: string };

export const IMG = {
  // Hero and venue
  castello: {
    src: "/foto/castello-estense.webp",
    alt: "Il Castello Estense di Ferrara in bianco e nero, con le torri e i balconi in mattoni",
  },
  tavoloMarmo: {
    src: "/foto/tavolo-marmo.webp",
    alt: "Tavolo in marmo scuro con bordo dorato: biscotti di pasta frolla, un caffè, una cioccolata fredda e una lattiera",
  },
  vetrinaInsegna: {
    src: "/foto/vetrina-insegna.webp",
    alt: "La vetrina del Duca d'Este con l'insegna Pasticceria e, nei vetri, il riflesso degli edifici della piazza",
  },
  salaTavoli: {
    src: "/foto/sala-tavoli.webp",
    alt: "La sala con tavolini, sedie imbottite color crema e boiserie con quadri incorniciati",
  },
  pareteQuadri: {
    src: "/foto/pareti-quadri.webp",
    alt: "Parete della sala con cornici argentate e manifesti d'epoca",
  },
  vetrinaDolci: {
    src: "/foto/vetrina-dolci.webp",
    alt: "Vetrina con cornetti, brioche, bomboloni, bignè e pasticcini",
  },
  aperitivo: {
    src: "/foto/aperitivo.webp",
    alt: "Spritz con fetta d'arancia, tagliere di crostini, prosciutto e formaggio su un tavolo in marmo",
  },
  colazione: {
    src: "/foto/colazione.webp",
    alt: "Cappuccino con cuore di schiuma e cornetto con zucchero a velo su un tavolo in marmo",
  },

  // Close-ups
  caffe: {
    src: "/foto/dettaglio-caffe.webp",
    alt: "Tazza di caffè nero con piattino bianco su marmo scuro",
  },
  cioccolata: {
    src: "/foto/dettaglio-cioccolata.webp",
    alt: "Bicchiere di cioccolata fredda con cacao in polvere su un piattino decorato",
  },
  cornetti: {
    src: "/foto/dettaglio-cornetti.webp",
    alt: "Cornetti, brioche e girelle esposti sui ripiani della vetrina",
  },
  pasticcini: {
    src: "/foto/dettaglio-pasticcini.webp",
    alt: "Pasticcini mignon: bignè, tartellette alle fragole e eclair al cioccolato",
  },
  cocktail: {
    src: "/foto/dettaglio-cocktail.webp",
    alt: "Calice di spritz con il sigillo del Duca d'Este e una ciotola di olive",
  },
} satisfies Record<string, Photo>;
