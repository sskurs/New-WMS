
export interface UomDefinition {
  name: string;
  abbreviation: string;
}

export const uomData: Record<string, UomDefinition[]> = {
  "Length": [
    { name: "meter", abbreviation: "m" },
    { name: "kilometer", abbreviation: "km" },
    { name: "centimeter", abbreviation: "cm" },
    { name: "millimeter", abbreviation: "mm" },
    { name: "micrometer", abbreviation: "µm" },
    { name: "nanometer", abbreviation: "nm" },
    { name: "inch", abbreviation: "in" },
    { name: "foot", abbreviation: "ft" },
    { name: "yard", abbreviation: "yd" },
    { name: "mile", abbreviation: "mi" }
  ],
  "Mass/Weight": [
    { name: "kilogram", abbreviation: "kg" },
    { name: "gram", abbreviation: "g" },
    { name: "milligram", abbreviation: "mg" },
    { name: "tonne", abbreviation: "t" },
    { name: "pound", abbreviation: "lb" },
    { name: "ounce", abbreviation: "oz" },
    { name: "ton", abbreviation: "ton" }
  ],
  "Time": [
    { name: "second", abbreviation: "s" },
    { name: "minute", abbreviation: "min" },
    { name: "hour", abbreviation: "hr" },
    { name: "day", abbreviation: "day" },
    { name: "week", abbreviation: "week" },
    { name: "month", abbreviation: "month" },
    { name: "year", abbreviation: "year" }
  ],
  "Temperature": [
    { name: "Celsius", abbreviation: "°C" },
    { name: "Kelvin", abbreviation: "K" },
    { name: "Fahrenheit", abbreviation: "°F" }
  ],
  "Volume": [
    { name: "liter", abbreviation: "L" },
    { name: "milliliter", abbreviation: "mL" },
    { name: "gallon", abbreviation: "gal" },
    { name: "quart", abbreviation: "qt" },
    { name: "pint", abbreviation: "pt" },
    { name: "fluid ounce", abbreviation: "fl oz" }
  ],
  "Electric Current": [
    { name: "ampere", abbreviation: "A" }
  ],
  "Amount of Substance": [
    { name: "mole", abbreviation: "mol" }
  ],
  "Luminous Intensity": [
    { name: "candela", abbreviation: "cd" }
  ],
  "Other": [
    { name: "Area: square meter", abbreviation: "m²" },
    { name: "Area: hectare", abbreviation: "ha" },
    { name: "Area: acre", abbreviation: "acre" },
    { name: "Speed: meter per second", abbreviation: "m/s" },
    { name: "Speed: kilometer per hour", abbreviation: "km/h" },
    { name: "Speed: miles per hour", abbreviation: "mph" },
    { name: "Force: newton", abbreviation: "N" },
    { name: "Pressure: pascal", abbreviation: "Pa" },
    { name: "Pressure: bar", abbreviation: "bar" },
    { name: "Energy: joule", abbreviation: "J" },
    { name: "Energy: calorie", abbreviation: "cal" },
    { name: "Power: watt", abbreviation: "W" },
    { name: "Angle: degree", abbreviation: "°" },
    { name: "Angle: radian", abbreviation: "rad" }
  ]
};
