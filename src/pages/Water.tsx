import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const Water = () => (
  <DrinkPage
    drink={getDrink("water")!}
    highlight={{
      title: "Pure. Clean. Trusted.",
      body: "Filtered through a multi-stage purification process for the cleanest, crispest taste · the water you can trust every day.",
    }}
    description="Sourced and bottled in Sierra Leone, KK Pure Drink Water is the everyday hydration choice for families and businesses."
    specs={[
      { k: "Type", v: "Pure Drinking Water" },
      { k: "Volume", v: "1500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Treatment", v: "Multi-stage filtration" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default Water;
