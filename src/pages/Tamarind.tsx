import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const Tamarind = () => (
  <DrinkPage
    drink={getDrink("tamarind")!}
    highlight={{
      title: "Tangy. Spicy. Unmistakable.",
      body: "An adventurous tamarind soda that balances sweet, sour and a little West African heat — a flavour you won't find anywhere else.",
    }}
    description="A bold tamarind-flavoured carbonated drink, proudly bottled in Sierra Leone."
    specs={[
      { k: "Flavour", v: "Tamarind" },
      { k: "Type", v: "Carbonated Soda" },
      { k: "Volume", v: "500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default Tamarind;
