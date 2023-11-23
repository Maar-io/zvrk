import { ConnectWallet } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
import Image from 'next/image';

export default function PreConnect() {
  return (
    <div className={styles.preConnect}>
      <Image
        src="/images/whirligig.png"
        alt="whirligig"
        className={styles.image}
        width={400} // adjust as needed
        height={400} // adjust as needed
      />        <div>
        <p className={styles.text}>Just connect your wallet and let&apos;s see how much you&apos;ve spent on zkAstar, then compare it with what it would have cost on the Ethereum mainnet.</p>
        <ConnectWallet
          dropdownPosition={{
            side: "top",
            align: "end",
          }}
        />
      </div>
    </div>
  );
}

