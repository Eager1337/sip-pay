import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const Orange = () => (
  <DrinkPage
    drink={getDrink("orange")!}
    highlight={{
      title: "Pure citrus joy in every bottle.",
      body: "Bright, zesty and bursting with sun-ripened orange flavour — KK Orange Fruity is the everyday refreshment that wakes up your taste buds.",
    }}
    description="Bottled fresh in Sierra Leone with the bright, juicy character of ripe oranges."
    specs={[
      { k: "Flavour", v: "Orange" },
      { k: "Type", v: "Fruity Soft Drink" },
      { k: "Volume", v: "500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default Orange;
