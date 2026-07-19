import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const Apple = () => (
  <DrinkPage
    drink={getDrink("apple")!}
    highlight={{
      title: "Crisp, carbonated, classic.",
      body: "A clean apple soda with the perfect bubble — refreshing on its own and a brilliant mixer for any occasion.",
    }}
    description="A classic apple-flavoured soda, carbonated and bottled fresh in Sierra Leone."
    specs={[
      { k: "Flavour", v: "Apple" },
      { k: "Type", v: "Carbonated Soda" },
      { k: "Volume", v: "500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default Apple;
