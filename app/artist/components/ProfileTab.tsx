const AVATAR_COLORS = [
  { label: 'Sky',      value: 'b6e3f4' },
  { label: 'Peach',    value: 'ffdfbf' },
  { label: 'Lavender', value: 'c0aede' },
  { label: 'Mint',     value: 'd1f4e0' },
  { label: 'Rose',     value: 'ffd6e0' },
  { label: 'Sand',     value: 'f5e6c8' },
  { label: 'Lilac',    value: 'e8d5f5' },
  { label: 'Teal',     value: 'a8e6e2' },
  { label: 'Butter',   value: 'fff3b0' },
  { label: 'Slate',    value: 'd4d8e2' },
]

// Avataaars parameters per gender
const GENDER_PARAMS = {
  male: {
    topOptions: ['shortHairShortFlat','shortHairShortRound','shortHairShortWaved','shortHairDreads01','shortHairFrizzle','shortHairTheCaesar','shortHairTheCaesarSidePart'],
    facialHairOptions: ['beardLight','beardMajestic','beardMedium','blank'],
    accessoriesOptions: ['blank','prescription01','prescription02','round','sunglasses','wayfarers'],
  },
  female: {
    topOptions: ['longHairBigHair','longHairBob','longHairCurly','longHairStraight','longHairStraight2','longHairShavedSides','longHairMiaWallace'],
    facialHairOptions: ['blank'],
    accessoriesOptions: ['blank','prescription01','prescription02','round','sunglasses','wayfarers'],
  },
  hijab: {
    topOptions: ['hijab'],
    facialHairOptions: ['blank'],
    accessoriesOptions: ['blank','prescription01','prescription02','round'],
  },
}

function randomFrom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomAvatarUrl(gender: 'male' | 'female' | 'hijab', color: string) {
  const params = GENDER_PARAMS[gender]
  const top           = randomFrom(params.topOptions)
  const facialHair    = randomFrom(params.facialHairOptions)
  const accessories   = randomFrom(params.accessoriesOptions)
  const skinOptions   = ['tanned','yellow','pale','light','brown','darkBrown','black']
  const skin          = randomFrom(skinOptions)
  const clotheOptions = ['blazerShirt','blazerSweater','collarSweater','graphicShirt','hoodie','overall','shirtCrewNeck','shirtScoopNeck','shirtVNeck']
  const clothe        = randomFrom(clotheOptions)
  const eyeOptions    = ['default','happy','hearts','side','squint','surprised','wink']
  const eyes          = randomFrom(eyeOptions)
  const mouthOptions  = ['default','eating','smile','tongue','twinkle']
  const mouth         = randomFrom(mouthOptions)

  const seed = Math.random().toString(36).slice(2, 8)

  return (
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
