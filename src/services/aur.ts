import axios from 'axios';

export interface AurPackageInfo {
  ID: number;
  Name: string;
  PackageBaseID: number;
  PackageBase: string;
  Version: string;
  Description: string;
  URL: string;
  NumVotes: number;
  Popularity: number;
  OutOfDate: number | null;
  Maintainer: string | null;
  FirstSubmitted: number;
  LastModified: number;
  URLPath: string;
}

export const getAurPackageInfo = async (pkgName: string): Promise<AurPackageInfo> => {
  const cleanPkg = pkgName.trim().toLowerCase();
  const response = await axios.get(`https://aur.archlinux.org/rpc/?v=5&type=info&arg[]=${encodeURIComponent(cleanPkg)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ReleaseMonitor/1.0)',
    },
    timeout: 10000,
  });

  if (response.data && response.data.results && response.data.results.length > 0) {
    return response.data.results[0] as AurPackageInfo;
  }

  throw new Error(`AUR Package '${pkgName}' not found`);
};
