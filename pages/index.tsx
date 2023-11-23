import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
// import Image from "next/image";
import { NextPage } from "next";
import TransactionsTable from "./TransactionsTable";
import { use } from "react";

const Home: NextPage = () => {

  const address: string | undefined = useAddress();
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
        </div>
      </div>
    </main>
  );
};

export default Home;
