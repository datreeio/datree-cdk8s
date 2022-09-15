const axios = require('axios').default;
const fs = require('fs');
const { pipeline } = require('stream/promises');
const extract = require('extract-zip');
const pjson = require('./package.json');
const spawn = require('child_process').spawn;

const TARGET_FILE_PATH = `/bin/datree.zip`;

// possible values: 'arm', 'arm64', 'ia32', 'mips','mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', or 'x64'
const mapDatreeAssets = {
  darwin: {
    arm64: 'darwin_arm64',
    x86_64: 'darwin_x86_64',
  },
  linux: {
    arm64: 'linux_arm64',
    x86_64: 'linux_x86_64',
    386: 'linux_386',
    x64: 'linux_x86_64',
  },
  win32: {
    386: 'windows_386',
    x86_64: 'windows_x86_64',
    x64: 'windows_x86_64',
  },
};

async function getDatreeLatestRelease(datreeVersion) {
  const url = `https://api.github.com/repos/datreeio/datree/releases/tags/${datreeVersion}`;
  console.log(`🌳 Getting latest release from ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'nodejs',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (response.status === 200) {
      console.log(`🌳 Latest release: ${response.data.tag_name}`);
      const platform = process.platform;
      let arch = process.arch;

      console.log(`🌳 Platform: ${platform}`);
      console.log(`🌳 Arch: ${arch}`);

      const assetName = mapDatreeAssets[platform][arch];
      if (!assetName) {
        throw new Error(`🌳 Unsupported platform: ${platform} ${arch}`);
      }

      console.log(`🌳 Asset name: ${assetName}`);

      const assets = response.data.assets;

      const matchUrl = assets.find((asset) => {
        const browser_download_url = asset.browser_download_url.toLowerCase();
        console.log(`🌳 Checking asset: ${browser_download_url}`);
        return browser_download_url.includes(assetName);
      });
      return matchUrl.browser_download_url;
    }
  } catch (error) {
    throw new Error(`🌳 Failed to get latest release: ${error}`);
  }
}

async function downloadFile(url, targetFile) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const writeStream = fs.createWriteStream(`./${targetFile}`);
  await pipeline(response.data, writeStream);

  return response.status;
}

async function unzipDatreeInDir() {
  console.log('🌳 Unzipping datree...');
  const absolutePath = `${process.cwd()}`;
  try {
    await extract(`${absolutePath}${TARGET_FILE_PATH}`, {
      dir: `${absolutePath}/bin`,
    });
    console.log('🌳 datree unzipped successfully');
  } catch (error) {
    throw new Error(`🌳 Failed to get unzip datree in dir: ${error}`);
  }
}

async function downloadDatree() {
  const datreeVersion = pjson.datree_version || 'latest';
  fs.existsSync('bin') || fs.mkdirSync('bin');

  const downloadUrl = await getDatreeLatestRelease(datreeVersion);
  console.log(`🌳 Downloading datree from ${downloadUrl}`);

  const downloadResult = await downloadFile(downloadUrl, TARGET_FILE_PATH);
  console.log(`🌳 Download result: ${downloadResult}`);
  if (downloadResult === 200) {
    await unzipDatreeInDir(TARGET_FILE_PATH);
    console.log('🌳 datree downloaded successfully');
  } else {
    console.log('🌳 Failed to download datree');
  }
}

downloadDatree();
