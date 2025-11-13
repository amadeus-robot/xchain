import hre from "hardhat";


async function main() {
  const BLSVerify = await hre.ethers.getContractFactory("BLSVerify");
  const blsVerify = await BLSVerify.deploy();
  console.log(await blsVerify.getAddress());
  await blsVerify.waitForDeployment();
  
  const pubKey = {
      x_a: "0x" + BigInt("13543975904092429560281716315864751138").toString(16).padStart(64, "0"),
      x_b: "0x" + BigInt("111022849395952064956478265176174406830686766543213148271945602771187906920076").toString(16).padStart(64, "0"),
      y_a: "0x" + BigInt("33472958331677899801220032596191519984").toString(16).padStart(64, "0"),
      y_b: "0x" + BigInt("90583252102554656131046097583482158216567079391027065915371965747423183058778").toString(16).padStart(64, "0")
    };

    const sig = {
      x_c0_a: "0x" + BigInt("12780674325596173921328184440545773457").toString(16).padStart(64, "0"),
      x_c0_b: "0x" + BigInt("83230619698717931381190252036444915591162734744112071986450428195886671827534").toString(16).padStart(64, "0"),
      x_c1_a: "0x" + BigInt("29838942989423688124672056096051238560").toString(16).padStart(64, "0"),
      x_c1_b: "0x" + BigInt("104803384101529698630264687588039042811790420927247773612256794282239749473259").toString(16).padStart(64, "0"),
      y_c0_a: "0x" + BigInt("27268916417469165602030417092070919301").toString(16).padStart(64, "0"),
      y_c0_b: "0x" + BigInt("61851856206544235472236738213275926630939133799962543086625283952273127329685").toString(16).padStart(64, "0"),
      y_c1_a: "0x" + BigInt("23773001621986189688304150713670191554").toString(16).padStart(64, "0"),
      y_c1_b: "0x" + BigInt("88592023272739319800459645347905619170309661461466421635503797174466009043477").toString(16).padStart(64, "0")
    };

    const result = await blsVerify.verify("0xff68700314ec05cbcd76830a1e988a25ded0452a5dec504f6cb0d986dedf97b5", 
        sig
      , pubKey);
  console.log("Result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

