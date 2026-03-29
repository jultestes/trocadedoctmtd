const brands = [
  "Carinhoso", "Kyly", "Milon", "Elian", "Brandili",
  "Up Baby", "Nanai", "Coloritta", "Malwee Kids", "Kukiê",
  "Mundi", "Infanti", "Luc.boo", "Onda Marinha",
];

const BrandsCarousel = () => {
  return (
    <section className="py-10 md:py-14 bg-secondary" id="marcas">
      <div className="container">
        <h2 className="section-title mb-8">Compre por Marca</h2>
      </div>
      <div className="overflow-hidden">
        <div className="flex animate-slide gap-6 w-max">
          {[...brands, ...brands].map((brand, i) => (
            <div
              key={i}
              className="bg-card rounded-xl px-8 py-4 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer shrink-0"
            >
              <span className="text-sm font-bold text-foreground whitespace-nowrap">
                {brand}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsCarousel;
