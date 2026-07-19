import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const Mango = () => (
  <DrinkPage
    drink={getDrink("mango")!}
    highlight={{
      title: "Sweet, smooth, unmistakably mango.",
      body: "Bursting with the warm, ripe flavour of West African mangoes, KK Mango Fruity is a refreshing soft drink the whole family can enjoy.",
    }}
    description="Made in Sierra Leone with care, KK Mango Fruity is bottled fresh in our Freetown facility and delivered across the country."
    specs={[
      { k: "Flavour", v: "Mango" },
      { k: "Type", v: "Fruity Soft Drink" },
      { k: "Volume", v: "500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default Mango;
