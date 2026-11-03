// Coordinates are taken from the supplied 581 × 437 reference image.
// The game renders them at 2× for crisp collision and responsive controls.
export const MAP = {
  referenceWidth:581, referenceHeight:437, scale:2,
  width:1162,height:874,
  topFloor:246,lowerFloor:422,
  upperSeesaw:{x:292,y:214,length:216,angle:.19},
  lowerSeesaw:{x:403,y:392,length:212,angle:.28},
  upperPortal:{blue:{x:55,y:248},red:{x:535,y:239}},
  exits:{red:{x:541,y:303},blue:{x:541,y:400}},
  characters:{bolt:{x:212,y:166},ninja:{x:410,y:222}},
  pulley:{leftWheel:{x:193,y:270},rightWheel:{x:244,y:270},
    leftPlatform:{x:192,y:315},rightWeight:{x:246,y:418}},
  crystals:{
    red:[[188,86],[292,102],[247,317]],
    blue:[[135,160],[536,91],[536,182],[136,310],[81,346],[329,315],[463,316]]
  },
  // The visible top maze and the bottom walkways follow the reference.
  topPlatforms:[
    [16,110,45,13],[79,155,103,15],[91,183,90,15],
    [166,109,42,17],[273,123,42,16],[376,109,43,18],
    [456,151,43,16],[503,110,62,15],[450,183,57,16],
    [16,192,58,17],[21,213,49,30]
  ],
  lowerPlatforms:[
    [31,298,48,16],[57,315,53,16],[62,372,58,16],
    [112,325,54,18],[168,315,44,14],[266,357,25,17],
    [500,327,69,15]
  ],
  // Decorations are separated from collision: passages remain playable.
  outerWalls:[
    [4,6,10,421],[568,6,10,421],[5,7,571,15],[7,423,569,10],
    [76,65,14,88],[488,65,14,88],[20,110,58,12],[501,110,67,12],
    [215,258,15,112],[252,258,16,113]
  ]
};
