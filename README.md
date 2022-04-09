# Stellar Generative Art Workshop @ NYC 🪐

  

  

Welcome to the Stellar Generative NFT Workshop repo. This repo is designed to work along side the in-person event. At the end of the workshop you should be able to modify this boilerplate code and implement your own spin on creating generative art. This workshop will be taught using Javascript.

  

  

If you are unfamiliar with the blockchain and its fundamentals, check out this [resource](https://stellar.org/developers) for understanding the basics and meet us back here when you are done.

  

  

## Getting Started

  

  

Before we get into the workshop we should cover some preliminary topics, such as:

  

1. What is Stellar? 📈

Stellar is a blockchain network with the goal to provide financial infrastructure that’s fast, cost-effective, resilient, and most importantly, available and accessible to anyone, regardless of where they live. Stellar is a unique blockchain due to its implementation of FBA in the Stellar Consensus Protocol. You can learn more about the protocol [here](https://www.stellar.org/papers/stellar-consensus-protocol?locale=en).

  

2. What are NFTs? 🖼️

NFT stands for Non fungible token. To be fungible means to be interchangeable, to be indistinguishable from another of the same type. For example, a $50 bill. It doesn't matter where you get the $50 bill from or what you spend it on, all $50 bills spend the same and are worth the same amount. Therefore, non fungible is a fancy way of saying unique. NFTs are unique digital assets that sit on a blockchain. They cannot be replicated and can represent anything. They can be art, music, rare collectables, experiences, even membership tokens. The sky is the limit when it comes to NFTs and new use cases are discovered all the time.

3. What is Generative Art? 🎨

Generative art is art created through the use of code. Algorithms are utilized to create dynamic shapes or even entire pieces. Machine learning algorithms in combination with user input can virtually create endless pieces of art.

 
## Installation & Usage 💾

 1. Download and install [node](https://nodejs.org/en/download/).
 2. Download the repo and open it in the code editor of choice. *We will be using [Visual Studio Code](https://code.visualstudio.com/)*.
 3. Navigate to the  Server directory and read the readme.
 4. Head to the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) and create two test accounts. Be sure to fund the test accounts using friendbot.
 5. Open the repo and rename `.env.local.default` to `.env.local`.
 6. Inside of `.env.local` fill in the signer secret key in the SINGER_SK variable.
 7. Inside of `.env.local` fill in the sponsor secret key in the SPONSOR_SK variable.
 8. Inside of `.env` fill in the signer public key into the VITE_SIGNER_PK variable.
 9. Inside of `.env.development` fill in the sponsor public key in the VITE_SPONSOR variable.
 10. Create a new terminal window, and run `npm i --no optional ` inside of the server directory.
 11. Run `npm start` inside of the server directory.
 12. Navigate to client directory, create an additional terminal window and run `npm i --no optional ` inside of the client directory. 
 13. Run `npm start` inside of the client directory.
 14. Yay! You are ready to start coding. 🥳
 
 The main file that you are going to be editing today it is the [image.js]( image.js). 
It would be helpful to have a base SVG to work from. You can create SVGs in [Figma](https://www.figma.com/) or [Sketch](https://www.sketch.com/home/). It is not required for you to make your own, but it will improve your understanding of how SVGs are drawn.
  

## Brainstorming & Resources 🧠

Coming up with ideas on the fly can be difficult here are some suggestions to get you started.
  

 ### Incremental Generative Art
 In this scenario the art would change based on the amount of NFTs that have been created. For example, the first NFT could be fairly simple, and as more people minted NFTs each NFT could get progressively more chaotic. 
 
*Note: These type of NFTs can be really fun to make but they are easily predictable. Some users may decide to wait until a certain number is reached before purchasing an NFT, because they can predict what the NFTs will look like.*
  

### Time Based Generative Art
In this scenario the art would change based the time you called the NFT. Since the SVGs are being drawn dynamically from a string of `image.js`, you could add time as a parameter.

### Weather Based Generative Art
In this scenario the art would change based on the weather at your current location. You could pull in the coordinates of your current location and tokenize the different types of weather (sunny, cloudy, rainy, etc). Combining location and weather together would result in dynamic SVGs.

*This is meant to be a collaborative workshop, so don't be afraid to work with other people to come up with great ideas*.

