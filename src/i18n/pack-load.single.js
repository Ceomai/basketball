// Tek dosya derlemesi: paket doğrudan içe aktarılır. Dinamik içe aktarma tek dosyada en üst düzey "await" ile
// birlikte paketi tanımlanmadan çağırıyordu ("Cannot access 'pack_en' before initialization").
import * as pack from "./pack.en.js";
export const loadPack = async () => pack;
