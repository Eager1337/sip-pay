import { DrinkPage } from "@/components/site/DrinkPage";
import { getDrink } from "@/data/drinks";

const MixedFruit = () => (
  <DrinkPage
    drink={getDrink("mixed-fruit")!}
    highlight={{
      title: "A symphony of fruits in every sip.",
      body: "Strawberry, blueberry, blackberry and raspberry come together in a deep, rich blend that's like no other soft drink.",
    }}
    description="A premium mixed-berry soft drink, bottled fresh in Sierra Leone."
    specs={[
      { k: "Flavour", v: "Mixed Berry" },
      { k: "Type", v: "Fruity Soft Drink" },
      { k: "Volume", v: "500ml" },
      { k: "Price", v: "Le 10" },
      { k: "Origin", v: "Sierra Leone" },
      { k: "Serve", v: "Best chilled" },
    ]}
  />
);
export default MixedFruit;
