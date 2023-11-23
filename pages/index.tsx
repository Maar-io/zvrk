import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
// import Image from "next/image";
import { NextPage } from "next";
import TransactionsTable from "./TransactionsTable";
import { use } from "react";

const Home: NextPage = () => {

  const address: string | undefined = useAddress();
  console.log("connected address", address);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <ConnectWallet
            dropdownPosition={{
              side: "top",
              align: "end", // Fix: Change "right" to "end"
            }}
          />
        </div>
        <div>
          {address && <TransactionsTable address={address} />}
          {!address && ("Just connect your wallet and let's see how much you've spent on zkAstar, and compare it with what it would have cost on the Ethereum mainnet.")}
        </div>
      </div>
    </main>
  );
};

export default Home;
