import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
// import Image from "next/image";
import { NextPage } from "next";
import TransactionsTable from "./TransactionsTable";
import PreConnect from "./PreConnect";

const Home: NextPage = () => {

  const address: string | undefined = useAddress();
  console.log("connected address", address);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {address ? (
          <>
        <div className={styles.header}>
              <ConnectWallet
                dropdownPosition={{
                  side: "top",
                  align: "end",
                }}
              />
        </div>
            <div>
              <TransactionsTable address={address} />
            </div>
          </>
        ) : (
          <PreConnect/>
        )}
      </div>
    </main>
  );
};

export default Home;
