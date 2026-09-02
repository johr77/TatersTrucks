export type GameImages = {
  dirt: HTMLImageElement | null;
  grass: HTMLImageElement | null;
  money: HTMLImageElement | null;
  nitro: HTMLImageElement | null;
  title: HTMLImageElement | null;
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadImages(): Promise<GameImages> {
  const [dirt, grass, money, nitro, title] = await Promise.all([
    loadImg("/game/dirt.jpg"),
    loadImg("/game/grass.jpg"),
    loadImg("/game/money.png"),
    loadImg("/game/nitro.png"),
    loadImg("/game/title.jpg"),
  ]);
  return { dirt, grass, money, nitro, title };
}
