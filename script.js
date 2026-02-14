// Simple 4x4 puzzle for two teams. Uses background-image slicing.
(function(){
  const ROWS = 4, COLS = 4, TOTAL = ROWS*COLS;
  // Config can be injected in the HTML via a global GAME_CONFIG
  const cfg = window.GAME_CONFIG || {};
  let currentLevel = 0;
  const GAME = window.GAME || (window.GAME = {});
  if(typeof GAME.currentLevel === 'undefined') GAME.currentLevel = currentLevel;
  if(!GAME.A) GAME.A = { level3Score: 0 };
  if(!GAME.B) GAME.B = { level3Score: 0 };
  // default image (can be overridden by admin). If levels are provided use first.
  let imageUrl = (cfg.levels && cfg.levels[0]) || cfg.imageUrl || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.0.3&s=0c5a7e3a1da6c2a1234567890abcdef';

  const containerId = cfg.containerId || (cfg.team === 'A' ? 'boardA' : (cfg.team === 'B' ? 'boardB' : null));
  const board = containerId ? document.getElementById(containerId) : null;
  const statusEl = document.getElementById('status');
  const puzzleSection = document.querySelector('.level-puzzle');
  const wordLevelSection = document.getElementById('wordLevel');
  const puzzleTimerEl = document.querySelector('.timer');
  const wordTimerEl = document.querySelector('.word-timer');
  const puzzleScoreEl = document.querySelector('.score');
  const wordScoreEl = document.querySelector('.word-score');
  const puzzleCompletionEl = document.querySelector('.completion');
  const wordCompletionEl = document.querySelector('.word-completion');
  const holdShowBtn = document.getElementById('holdShowBtn');
  const teamANameEl = document.getElementById('teamAName');
  const teamBNameEl = document.getElementById('teamBName');
  const teamANameInput = document.getElementById('teamANameInput');
  const teamBNameInput = document.getElementById('teamBNameInput');
  const setTeamANameBtn = document.getElementById('setTeamANameBtn');
  const setTeamBNameBtn = document.getElementById('setTeamBNameBtn');
  const totalALabelEl = document.getElementById('totalALabel');
  const totalBLabelEl = document.getElementById('totalBLabel');
  const playerTeamNameEls = Array.from(document.querySelectorAll('[data-team-name]'));

  function setTeamNameUI(team, name){
    const rawTeam = String(team || '').trim();
    let teamKey = rawTeam;
    if(/^A$/i.test(rawTeam) || /^team\s*A$/i.test(rawTeam) || /^teamA$/i.test(rawTeam)) teamKey = 'A';
    if(/^B$/i.test(rawTeam) || /^team\s*B$/i.test(rawTeam) || /^teamB$/i.test(rawTeam)) teamKey = 'B';
    const safeName = (name || '').trim();
    if(!safeName) return;
    if(teamKey === 'A'){
      if(teamANameEl) teamANameEl.textContent = safeName;
      if(totalALabelEl) totalALabelEl.textContent = safeName;
      try{ localStorage.setItem('teamAName', safeName); }catch(e){}
    } else if(teamKey === 'B'){
      if(teamBNameEl) teamBNameEl.textContent = safeName;
      if(totalBLabelEl) totalBLabelEl.textContent = safeName;
      try{ localStorage.setItem('teamBName', safeName); }catch(e){}
    }
    if(cfg.team === teamKey){
      playerTeamNameEls.forEach(el=>{ el.textContent = safeName; });
    }
  }

  (function preloadTeamNameFromStorage(){
    try{
      if(cfg.team === 'A'){
        const name = localStorage.getItem('teamAName');
        if(name) playerTeamNameEls.forEach(el=>{ el.textContent = name; });
      } else if(cfg.team === 'B'){
        const name = localStorage.getItem('teamBName');
        if(name) playerTeamNameEls.forEach(el=>{ el.textContent = name; });
      } else {
        const aName = localStorage.getItem('teamAName');
        const bName = localStorage.getItem('teamBName');
        if(aName){
          if(teamANameEl) teamANameEl.textContent = aName;
          if(totalALabelEl) totalALabelEl.textContent = aName;
        }
        if(bName){
          if(teamBNameEl) teamBNameEl.textContent = bName;
          if(totalBLabelEl) totalBLabelEl.textContent = bName;
        }
      }
    }catch(e){}
  })();

  let timeLimit = cfg.timeLimit || 120;
  let remaining = timeLimit;
  let interval = null;
  let started = false;
  let finished = false;
  let pubWs = null;
  let scoreRecorded = false;
  let levelMode = 'puzzle'; // 'puzzle' | 'memory' | 'word'
  let memoryState = null;
  let wordState = null;
  let wsRecoveryScheduled = false;
  let lastAuthoritativeLevelSig = '';
  let winnerFromServer = false;

  function scheduleWsRecovery(reason){
    if(wsRecoveryScheduled) return;
    wsRecoveryScheduled = true;
    try{ if(statusEl) statusEl.textContent = reason || 'Connection lost. Reconnecting...'; }catch(e){}
    setTimeout(()=>{
      try{ window.location.reload(); }catch(e){}
    }, 1500);
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (ev)=> resolve(ev.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(dataUrl){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function fileToCompressedDataUrl(file, maxSide = 1920, quality = 0.92){
    const srcDataUrl = await readFileAsDataUrl(file);
    const img = await loadImageFromDataUrl(srcDataUrl);
    const w = img.width || 0;
    const h = img.height || 0;
    if(!w || !h) return srcDataUrl;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if(!ctx) return srcDataUrl;
    ctx.drawImage(img, 0, 0, tw, th);
    const MAX_BYTES = 3 * 1024 * 1024;
    let q = quality;
    let out = canvas.toDataURL('image/jpeg', q);
    while(out.length > MAX_BYTES * 1.37 && q > 0.7){
      q = Math.max(0.7, q - 0.05);
      out = canvas.toDataURL('image/jpeg', q);
    }
    return out;
  }

  function normalizeSharedImageUrl(url){
    if(!url || typeof url !== 'string') return url;
    if(url.startsWith('data:')) return url;
    try{
      const u = new URL(url, window.location.href);
      if(u.hostname === 'localhost' || u.hostname === '127.0.0.1'){
        u.hostname = window.location.hostname;
        return u.toString();
      }
      return u.toString();
    }catch(e){
      return url;
    }
  }

  function getUploadEndpoint(){
    const wsSource = cfg.adminWs || cfg.ws;
    if(wsSource){
      try{
        const u = new URL(wsSource, window.location.href);
        u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
        u.pathname = '/upload';
        u.search = '';
        u.hash = '';
        return u.toString();
      }catch(e){}
    }
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    return `${proto}://${host}:8000/upload`;
  }

  async function uploadImageFile(file){
    const endpoint = getUploadEndpoint();
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    let data = null;
    try{ data = await resp.json(); }catch(e){}
    if(!resp.ok || !data || !data.url){
      const errMsg = data && data.error ? data.error : `Upload failed (${resp.status})`;
      throw new Error(errMsg);
    }
    return normalizeSharedImageUrl(data.url);
  }
  let solvedPreviewActive = false;
  let solvedPreviewSnapshot = null;

  const WORD_CATEGORIES = [
    'Country name',
    'Food name',
    'Drink name',
    'Animal name'
  ];

  // Updated list to include 1000 foods and 1000 drinks for the game
  const data = {
    countries: {
        A: ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan"],
        B: ["Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi"],
        C: ["Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic"],
        D: ["Denmark", "Djibouti", "Dominica", "Dominican Republic"],
        E: ["Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia"],
        F: ["Fiji", "Finland", "France"],
        G: ["Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana"],
        H: ["Haiti", "Honduras", "Hungary"],
        I: ["Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy"],
        J: ["Jamaica", "Japan", "Jordan"],
        K: ["Kazakhstan", "Kenya", "Kiribati", "Korea (North)", "Korea (South)", "Kosovo", "Kuwait", "Kyrgyzstan"],
        L: ["Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg"],
        M: ["Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar"],
        N: ["Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway"],
        O: ["Oman"],
        P: ["Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal"],
        Q: ["Qatar"],
        R: ["Romania", "Russia", "Rwanda"],
        S: ["Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria"],
        T: ["Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu"],
        U: ["Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan"],
        V: ["Vanuatu", "Vatican City", "Venezuela", "Vietnam"],
        W: ["Yemen"],
        Z: ["Zambia", "Zimbabwe"]
    },
    foods: {
        A: ["Apple", "Avocado", "Artichoke", "Asparagus", "Almond", "Apricot", "Acorn Squash", "Amaranth", "Anchovy", "Arugula"],
        B: ["Banana", "Blueberry", "Broccoli", "Brussels Sprouts", "Bread", "Bagel", "Bacon", "Basil", "Blackberry", "Beet"],
        C: ["Carrot", "Cucumber", "Cabbage", "Cauliflower", "Celery", "Chili", "Cheese", "Chicken", "Chickpea", "Cilantro"],
        D: ["Dumpling", "Date", "Duck", "Dill", "Donut", "Dragonfruit", "Durian", "Dandelion Greens", "Danish", "Dosa"],
        E: ["Egg", "Eggplant", "Edamame", "Endive", "Escarole", "Eel", "Elderberry", "Emmental", "English Muffin", "Espresso"],
        F: ["Fish", "Fig", "Fennel", "Feta", "Falafel", "Focaccia", "French Fries", "Fudge", "Flan", "Frosting"],
        G: ["Grapes", "Garlic", "Ginger", "Gooseberry", "Gouda", "Granola", "Gnocchi", "Graham Cracker", "Guacamole", "Gumbo"],
        H: ["Hamburger", "Honey", "Hazelnut", "Hummus", "Haddock", "Halibut", "Hoisin Sauce", "Hot Dog", "Havarti", "Hash Browns"],
        I: ["Ice Cream", "Indian Curry", "Italian Sausage", "Iceberg Lettuce", "Idli", "Irish Soda Bread", "Iced Tea", "Instant Noodles", "Icing", "Italian Dressing"],
        J: ["Jam", "Jelly", "Jalapeno", "Jackfruit", "Jicama", "Jerky", "Juice", "Jellybean", "Jasmine Rice", "Jambalaya"],
        K: ["Kebab", "Kiwi", "Kale", "Ketchup", "Kimchi", "Kohlrabi", "Kombucha", "Kasha", "Kippers", "Kheer"],
        L: ["Lettuce", "Lemon", "Lime", "Lentil", "Lobster", "Lychee", "Lasagna", "Lollipop", "Linguine", "Liver"],
        M: ["Mango", "Mushroom", "Milk", "Muffin", "Macaroni", "Meatball", "Miso", "Mozzarella", "Meringue", "Melon"],
        N: ["Noodles", "Nutmeg", "Nectarine", "Naan", "Nachos", "Natto", "Nougat", "Nuggets", "Nicoise Salad", "Nori"],
        O: ["Orange", "Olive", "Onion", "Oregano", "Oatmeal", "Octopus", "Okra", "Omelette", "Orzo", "Oysters"],
        P: ["Pizza", "Pasta", "Peach", "Pear", "Pineapple", "Papaya", "Peanut", "Pepper", "Potato", "Pumpkin"],
        Q: ["Quiche", "Quinoa", "Quail", "Quesadilla", "Quince", "Quark", "Quahog", "Quenelle", "Quavers", "Quetsch"],
        R: ["Rice", "Raspberry", "Radish", "Raisin", "Rhubarb", "Ricotta", "Ravioli", "Ratatouille", "Ramen", "Roulade"],
        S: ["Salad", "Spinach", "Strawberry", "Sushi", "Sausage", "Soup", "Scone", "Salsa", "Saffron", "Schnitzel"],
        T: ["Taco", "Tomato", "Turkey", "Tofu", "Tangerine", "Tuna", "Turnip", "Tortilla", "Tiramisu", "Tapioca"],
        U: ["Udon", "Ugli Fruit", "Upside-Down Cake", "Urfa Pepper", "Ube", "Umami Paste", "Urad Dal", "Ukrainian Borscht", "Unagi", "Umeboshi"],
        V: ["Vanilla", "Vegetable", "Venison", "Vermicelli", "Vinegar", "Vichyssoise", "Victoria Sponge", "Vada", "Velveeta", "Vermouth"],
        W: ["Waffle", "Walnut", "Watermelon", "Wasabi", "Wheat", "Whipped Cream", "White Chocolate", "Wiener", "Wonton", "Worcestershire Sauce"],
        X: ["Xacuti", "Xigua", "Xylitol", "Xnipec", "Xouba", "Xingren", "Xocolatl", "Xiaolongbao", "Xerem", "Xerophyte"],
        Y: ["Yogurt", "Yam", "Yeast", "Yellowtail", "Yuzu", "Yabby", "Yakhni", "Yassa", "Yokan", "Yorkshire Pudding"],
        Z: ["Zucchini", "Ziti", "Zest", "Zander", "Zabaglione", "Zopf", "Zhoug", "Ziti Pasta", "Zinfandel", "Zebra Cake"]
    },
    drinks: {
        A: ["Apple Juice", "Apricot Nectar", "Aloe Vera Drink", "Amaretto", "Arnold Palmer", "Absinthe", "Aperol", "Apple Cider", "Aguardiente", "Akvavit"],
        B: ["Beer", "Black Tea", "Bubble Tea", "Buttermilk", "Bloody Mary", "Bourbon", "Brandy", "Baileys", "Bacardi", "Boba"],
        C: ["Coffee", "Coca-Cola", "Coconut Water", "Cranberry Juice", "Champagne", "Chai", "Cider", "Campari", "Cognac", "Cucumber Water"],
        D: ["Daiquiri", "Diet Coke", "Dr. Pepper", "Dry Martini", "Dubonnet", "Dandelion Tea", "Dark Beer", "Detox Water", "Dragonfruit Juice", "Dewberry Cordial"],
        E: ["Espresso", "Elderflower Cordial", "Eggnog", "Energy Drink", "Earl Grey Tea", "Ethanol", "Eiskaffee", "Elderberry Wine", "Evian", "Ethiopian Coffee"],
        F: ["Fanta", "Fruit Punch", "Fennel Tea", "Flat White", "Frappuccino", "Fernet", "Fizzy Water", "Frozen Margarita", "Frosty", "Frappe"],
        G: ["Ginger Ale", "Green Tea", "Grape Juice", "Gin", "Gimlet", "Grenadine", "Ginger Beer", "Grog", "Guava Juice", "Ginseng Tea"],
        H: ["Hot Chocolate", "Herbal Tea", "Horchata", "Hibiscus Tea", "Honey Mead", "Hefeweizen", "Hot Toddy", "Hurricane", "Hibiscus Water", "Hoppy Beer"],
        I: ["Iced Tea", "Irish Coffee", "Ice Water", "Indian Chai", "Iced Latte", "Italian Soda", "Ice Wine", "Iced Mocha", "Iced Cappuccino", "Iceberg"],
        J: ["Juice", "Jasmine Tea", "Julep", "Jagermeister", "Jamaica Water", "Jack Daniels", "Jalapeno Margarita", "Jasmine Milk Tea", "Jungle Juice", "Jolt Cola"],
        K: ["Kombucha", "Kahlua", "Kefir", "Kiwi Juice", "Kool-Aid", "Kava", "Kopi Luwak", "Kumquat Juice", "Kirin Beer", "Krupnik"],
        L: ["Lemonade", "Lime Juice", "Lassi", "Latte", "Long Island Iced Tea", "Lager", "Lychee Juice", "Lillet", "Lemon Water", "Limoncello"],
        M: ["Milk", "Mojito", "Matcha", "Margarita", "Mulled Wine", "Mimosa", "Milkshake", "Malibu", "Martini", "Mead"],
        N: ["Nectar", "Negroni", "Nut Milk", "Nettle Tea", "Nimbu Pani", "Nesquik", "Naked Juice", "Naranjilla Juice", "Nocino", "Nettle Beer"],
        O: ["Orange Juice", "Oolong Tea", "Ouzo", "Old Fashioned", "Oat Milk", "Orangina", "Ovaltine", "Oyster Shooter", "Ouzo Lemonade", "Oregon Chai"],
        P: ["Punch", "Pina Colada", "Peach Tea", "Peppermint Tea", "Port", "Prosecco", "Perrier", "Pomegranate Juice", "Pale Ale", "Pisco Sour"],
        Q: ["Quinine Water", "Quince Juice", "Qishr", "Quark Smoothie", "Quetsch", "Quince Wine", "Quark", "Quahog", "Quenelle", "Quavers"],
        R: ["Rum", "Raspberry Tea", "Root Beer", "Red Wine", "Rooibos Tea", "Raspberry Lemonade", "Raki", "Raspberry Smoothie", "Rhubarb Cordial", "Raspberry Vodka"],
        S: ["Soda", "Sangria", "Smoothie", "Scotch", "Seltzer", "Shirley Temple", "Sake", "Sambuca", "Sarsaparilla", "Sauvignon Blanc"],
        T: ["Tea", "Tonic Water", "Tomato Juice", "Tequila", "Turmeric Latte", "Thai Iced Tea", "Tamarind Juice", "Tisane", "Tangerine Juice", "Triple Sec"],
        U: ["Umeshu", "Ube Milkshake", "Uva Tea", "Ukrainian Vodka", "Uji Matcha", "Umeshu Soda", "Ube Latte", "Uva Juice", "Umeshu Cocktail", "Ube Smoothie"],
        V: ["Vodka", "Vanilla Milkshake", "Vermouth", "Vitamin Water", "V8 Juice", "Valpolicella", "Vanilla Latte", "Vinho Verde", "Violet Liqueur", "Vegan Smoothie"],
        W: ["Water", "Whiskey", "White Wine", "Wheatgrass Juice", "Warm Milk", "Winter Ale", "Wassail", "White Russian", "Whey Protein Shake", "Wild Berry Tea"],
        X: ["Xingren Almond Drink", "Xocolatl", "Xiaoshu Tea", "Xanadu Wine", "Xylitol Water", "Xingren Smoothie", "Xouba Juice", "Xerem Drink", "Xerophyte Tea", "Xigua Juice"],
        Y: ["Yakult", "Yerba Mate", "Yellow Tea", "Yogurt Drink", "Yunnan Coffee", "Yuzu Soda", "Yam Wine", "Yogurt Smoothie", "Yunnan Tea", "Yuzu Cocktail"],
        Z: ["Zinfandel", "Zobo Drink", "Zucchini Juice", "Zebra Milk", "Zinger Tea", "Zubrowka", "Zobo Punch", "Zinfandel Rose", "Zebra Smoothie", "Zesty Lemonade"]
    },
    animals: {
        A: ["Antelope", "Aardvark", "Albatross", "Alligator", "Anaconda", "Armadillo", "Axolotl", "Aye-Aye", "African Elephant", "Arctic Fox"],
        B: ["Bear", "Bison", "Baboon", "Bat", "Beaver", "Blue Whale", "Butterfly", "Buzzard", "Bald Eagle", "Barracuda"],
        C: ["Cat", "Cheetah", "Cobra", "Camel", "Capybara", "Chameleon", "Coyote", "Crab", "Crow", "Caterpillar"],
        D: ["Dog", "Dolphin", "Duck", "Deer", "Dragonfly", "Dodo", "Donkey", "Dugong", "Dhole", "Dachshund"],
        E: ["Elephant", "Eagle", "Eel", "Emu", "Egret", "Ermine", "Earthworm", "Eastern Bluebird", "Echidna", "Elk"],
        F: ["Fox", "Frog", "Falcon", "Flamingo", "Firefly", "Ferret", "Fiddler Crab", "Flying Squirrel", "Fossa", "Frigatebird"],
        G: ["Giraffe", "Goat", "Gorilla", "Gecko", "Goldfish", "Grasshopper", "Gannet", "Gazelle", "Gibbon", "Gila Monster"],
        H: ["Horse", "Hawk", "Hedgehog", "Heron", "Hippopotamus", "Honeybee", "Hornbill", "Hummingbird", "Hyena", "Harpy Eagle"],
        I: ["Iguana", "Indian Star Tortoise", "Indian Cobra", "Indian Elephant", "Indian Pangolin", "Indian Starling", "Indian Mongoose", "Indian Peafowl", "Indian Python", "Indian Starfish"],
        J: ["Jaguar", "Jellyfish", "Jackal", "Jackrabbit", "Japanese Macaque", "Javan Rhino", "Jungle Cat", "Junco", "Jerboa", "Jacana"],
        K: ["Kangaroo", "Koala", "Kookaburra", "Kudu", "Kiwi", "Kingfisher", "Kite", "Killer Whale", "Komodo Dragon", "Krill"],
        L: ["Lion", "Lemur", "Leopard", "Lynx", "Llama", "Lobster", "Ladybug", "Lamprey", "Leafcutter Ant", "Lungfish"],
        M: ["Monkey", "Moose", "Mongoose", "Manta Ray", "Manatee", "Mole", "Moth", "Macaw", "Magpie", "Mandrill"],
        N: ["Narwhal", "Newt", "Nightingale", "Numbat", "Nautilus", "Nile Crocodile", "Northern Cardinal", "Northern Pike", "Nudibranch", "Nutria"],
        O: ["Owl", "Octopus", "Otter", "Ocelot", "Orangutan", "Ostrich", "Ox", "Osprey", "Orca", "Okapi"],
        P: ["Penguin", "Panda", "Parrot", "Peacock", "Pelican", "Porcupine", "Puma", "Platypus", "Puffin", "Python"],
        Q: ["Quail", "Quokka", "Quetzal", "Queen Bee", "Quagga", "Quoll", "Quahog", "Quetzalcoatlus", "Quokka Wallaby", "Queen Triggerfish"],
        R: ["Rabbit", "Raccoon", "Rat", "Raven", "Red Panda", "Reindeer", "Rhinoceros", "Robin", "Rockhopper Penguin", "Rottweiler"],
        S: ["Snake", "Shark", "Sheep", "Sloth", "Snail", "Spider", "Swan", "Squirrel", "Starfish", "Seahorse"],
        T: ["Tiger", "Turtle", "Toucan", "Tarantula", "Tuna", "Turkey", "Termite", "Tortoise", "Tasmanian Devil", "Tapir"],
        U: ["Urial", "Umbrellabird", "Uakari", "Ugandan Kob", "Unicornfish", "Upland Sandpiper", "Urchin", "Ulysses Butterfly", "Umbrella Octopus", "Ural Owl"],
        V: ["Vulture", "Viper", "Vicuna", "Vervet Monkey", "Vinegaroon", "Velvet Worm", "Vampire Bat", "Vaquita", "Violet-backed Starling", "Vine Snake"],
        W: ["Wolf", "Whale", "Walrus", "Wombat", "Woodpecker", "Warthog", "Weasel", "Wildebeest", "Wolverine", "Wrasse"],
        X: ["Xerus", "Xantus's Hummingbird", "X-ray Tetra", "Xenopus", "Xenarthra", "Xenops", "Xenopus Frog", "Xenoturbella", "Xenopus Toad", "Xerus Squirrel"],
        Y: ["Yak", "Yellowjacket", "Yellowhammer", "Yellowfin Tuna", "Yellowtail Snapper", "Yellow Baboon", "Yellow Mongoose", "Yellow Warbler", "Yellow Tang", "Yellow Anaconda"],
        Z: ["Zebra", "Zebu", "Zorilla", "Zander", "Zebra Finch", "Zebra Shark", "Zebra Spider", "Zebra Swallowtail", "Zebra Mussel", "Zebra Dove"]
    }
};

// Function to compare player input with the list and assign points
function compareInput(category, letter, input) {
    const validInputs = data[category][letter];
    if (validInputs && validInputs.some(validInput => validInput.toLowerCase() === input.toLowerCase())) {
        return 1; // Assign 1 point for correct input
    }
    return 0; // No points for incorrect input
}

// Function to compare player inputs for animal, food, drink, and country
function evaluatePlayerInputs(playerInputs) {
    const { animal, food, drink, country } = playerInputs;
    let score = 0;

    // Compare animal
    if (compareInput('animals', animal[0].toUpperCase(), animal)) {
        score += 1;
    }

    // Compare food
    if (compareInput('foods', food[0].toUpperCase(), food)) {
        score += 1;
    }

    // Compare drink
    if (compareInput('drinks', drink[0].toUpperCase(), drink)) {
        score += 1;
    }

    // Compare country
    if (compareInput('countries', country[0].toUpperCase(), country)) {
        score += 1;
    }

    return score; // Return the total score
}

// Example usage:
// const points = compareInput('animals', 'A', 'Antelope');
// console.log(points); // Output: 1

  const wordSection = document.getElementById('wordChallenge');
  const wordLetterEl = document.getElementById('challengeLetter');
  const wordCategoriesEl = document.getElementById('wordCategories');
  const submitWordsBtn = document.getElementById('submitWordsBtn');
  const wordStatusEl = document.getElementById('wordStatus');

  function formatTime(sec){
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }

  function makeBoard(container){
    container.innerHTML='';
    for(let i=0;i<TOTAL;i++){
      const slot = document.createElement('div');
      slot.className='slot';
      slot.dataset.index = i;
      slot.addEventListener('dragover',e=>e.preventDefault());
      slot.addEventListener('drop',onDrop);
      container.appendChild(slot);
    }
  }

  function createPieces(){
    const pieces = [];
    for(let i=0;i<TOTAL;i++){
      const piece = document.createElement('div');
      piece.className='piece';
      piece.draggable = true;
      piece.dataset.correct = i;
      const row = Math.floor(i/COLS);
      const col = i%COLS;
      const x = (col/(COLS-1))*100;
      const y = (row/(ROWS-1))*100;
        piece.style.backgroundImage = `url(${imageUrl})`;
        // set explicit background-size to match grid so each piece maps correctly
        piece.style.backgroundSize = `${COLS*100}% ${ROWS*100}%`;
        // precise background position for the slice
        piece.style.backgroundPosition = `${(x).toFixed(6)}% ${(y).toFixed(6)}%`;
      piece.addEventListener('dragstart',onDragStart);
      pieces.push(piece);
    }
    return pieces;
  }

  function shuffleArray(a){
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
  }

  function populateBoard(container){
    const pieces = createPieces();
    // shuffle until no piece is in its correct slot (derangement) to avoid initial partial scores
    let attempts = 0;
    do{
      shuffleArray(pieces);
      attempts++;
      if(attempts>2000) break;
    } while(pieces.some((p,idx)=> String(p.dataset.correct) === String(idx)));
    const slots = Array.from(container.children);
    for(let i=0;i<TOTAL;i++){
      slots[i].appendChild(pieces[i]);
    }
  }

  let dragEl = null;
  function onDragStart(e){ if(finished){ e.preventDefault(); dragEl = null; return; } dragEl = e.target; }

  function _preventDrag(e){ e.preventDefault(); }

  function onDrop(e){
    if(!dragEl || finished) return;
    const targetSlot = e.currentTarget;
    const sourceSlot = dragEl.parentElement;
    if(!sourceSlot || !targetSlot) return;
    if(sourceSlot === targetSlot) return;
    const targetChild = targetSlot.firstElementChild;
    targetSlot.appendChild(dragEl);
    if(targetChild) sourceSlot.appendChild(targetChild);
    updateScores();
  }

  function checkCompletionForContainer(container){
    const slots = Array.from(container.children);
    let correct = 0;
    slots.forEach(s=>{
      const child = s.firstElementChild;
      if(child && String(child.dataset.correct) === s.dataset.index) correct++;
    });
    return correct;
  }

  function updateScores(){
    if(!board) return;
    if(levelMode === 'word') return;
    if(finished) return; // stop updating scores after round finished
    const correct = checkCompletionForContainer(board);
    const points = correct * 10;
    const pct = Math.round((correct/TOTAL)*100);
    if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${points}`;
    if(puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${pct}%`;
    // broadcast progress so admin can show matched pairs and completion
    try{ const msg = { type: 'progress', payload: { team: cfg.team || 'unknown', matched: correct, pairs: TOTAL, remaining } };
      console.debug('Sending progress:', msg);
      if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(msg));
    }catch(e){ console.error('progress send failed', e); }
    if(correct === TOTAL){
      endGame('You', remaining);
    }
  }

  function endGame(winner, remainingSec){
    finished = true;
    clearInterval(interval);
    if(statusEl) statusEl.textContent = `${winner} completed the puzzle!`;
    if(puzzleScoreEl){
      puzzleScoreEl.textContent += ` (completed)`;
    }
    // disable further moves and record/advance (only once)
    disableMoves();
    if(!scoreRecorded){
      // prepare entry and try to notify server/admin immediately, then record locally
      try{
        const correct = checkCompletionForContainer(board);
        const points = correct * 10;
        const inferredLevel = Number(currentLevel) || (levelMode === 'memory' ? 2 : (levelMode === 'word' ? 3 : 1));
        const entry = { team: cfg.team || 'unknown', level: inferredLevel, matched: correct, pairs: TOTAL, score: points, bonus: 0, reason: 'complete', timestamp: Date.now() };
        if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'roundComplete', payload: entry }));
      }catch(e){console.error('send immediate roundComplete failed', e)}
      recordScoreAndAdvance('complete');
    }
  }

  function disableMoves(){
    if(!board) return;
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach(p=>{
      try{ p.draggable = false; p.removeEventListener('dragstart', onDragStart); p.addEventListener('dragstart', _preventDrag); }catch(e){}
    });
  }

  function enableMoves(){
    if(!board) return;
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach(p=>{
      try{ p.draggable = true; p.removeEventListener('dragstart', _preventDrag); p.addEventListener('dragstart', onDragStart); }catch(e){}
    });
  }

  function recordScoreAndAdvance(reason, notifyCoordinator = true, advanceLevel = true){
    if(!board) return;
    let score = 0;
    let pairs = TOTAL;
    let matched = 0;
    const effectiveTimeLimit = (levelMode === 'memory' && memoryState && memoryState.timeLimit) ? memoryState.timeLimit : timeLimit;
    if(levelMode === 'word' && wordState){
      matched = wordState.correctCount || 0;
      pairs = wordState.total || wordState.categories.length || 0;
      score = matched * 10;
    } else if(levelMode === 'memory' && memoryState){
      matched = memoryState.matched || 0;
      pairs = memoryState.pairs || 0;
      score = matched * 10;
    } else {
      matched = checkCompletionForContainer(board);
      pairs = TOTAL;
      score = matched * 10;
    }
    const bonus = 0;
    const inferredLevel = Number(currentLevel) || (levelMode === 'memory' ? 2 : (levelMode === 'word' ? 3 : 1));
    const entry = { team: cfg.team || 'unknown', level: inferredLevel, matched, pairs, score, bonus, reason, timestamp: Date.now() };
    try{
      const existing = JSON.parse(localStorage.getItem('puzzle_scores')||'[]');
      existing.push(entry);
      localStorage.setItem('puzzle_scores', JSON.stringify(existing));
    }catch(e){ console.error('storing score failed', e); }
    // notify coordinator about round completion if requested
    try{ if(notifyCoordinator && pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'roundComplete', payload: entry })); }catch(e){ console.error(e); }
    // defensive: also send a progress message immediately so admin sees matched/score update
    try{ if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'progress', payload: { team: entry.team, matched, pairs, remaining } })); }catch(e){}

    scoreRecorded = true;

    if(advanceLevel){
      // if levels configured locally, advance automatically
      if(cfg.levels && Array.isArray(cfg.levels) && cfg.levels.length > currentLevel+1){
        currentLevel++;
        const next = cfg.levels[currentLevel];
        if(statusEl) statusEl.textContent = 'Loading next level...';
        setTimeout(()=>{ applyImage(next); resetLocal(); }, 800);
        return;
      }
      // otherwise request next level from coordinator
      if(statusEl) statusEl.textContent = 'Round finished. Waiting for next level...';
      try{ if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'requestNextLevel', team: cfg.team })); }catch(e){}
    }
  }

  function tick(){
    if(finished) return;
    remaining -= 1;
    const activeTimer = (levelMode === 'word' ? wordTimerEl : puzzleTimerEl);
    if(activeTimer) activeTimer.textContent = formatTime(remaining);
    // also update admin global timer display if present
    try{ const g = document.getElementById('globalTimer'); if(g) g.textContent = formatTime(remaining); }catch(e){}
    if(remaining<=0){
      clearInterval(interval);
      finished = true;
      if(statusEl) statusEl.textContent = 'Time is up';
      if(levelMode === 'word') disableWordInputs();
      disableMoves();
      recordScoreAndAdvance('timeout');
    }
  }

  function startLocalTimer(atStartTimestamp, limitSeconds){
    // Server is authoritative for timer synchronization across different devices.
    timeLimit = limitSeconds;
    remaining = timeLimit;
    started = true; finished = false;
    showLevelMode(levelMode === 'word' ? 'word' : 'puzzle');
    if(statusEl) statusEl.textContent = 'Game started';
    const activeTimer = (levelMode === 'word' ? wordTimerEl : puzzleTimerEl);
    if(activeTimer) activeTimer.textContent = formatTime(remaining);
    try{ const g = document.getElementById('globalTimer'); if(g) g.textContent = formatTime(remaining); }catch(e){}
    clearInterval(interval);
    enableMoves();
    enableWordInputs();
    updateScores();
  }

  function resetLocal(){
    clearInterval(interval);
    started = false; finished = false;
    scoreRecorded = false;
    timeLimit = cfg.timeLimit || 120;
    remaining = timeLimit;
    levelMode = 'puzzle';
    if(memoryState && memoryState.previewTimeout){
      try{ clearTimeout(memoryState.previewTimeout); }catch(e){}
    }
    memoryState = null;
    wordState = null;
    resetWordUI();
    if(statusEl) statusEl.textContent = 'Waiting to start';
    if(puzzleTimerEl) puzzleTimerEl.textContent = formatTime(remaining);
    if(wordTimerEl) wordTimerEl.textContent = formatTime(remaining);
    try{ const g = document.getElementById('globalTimer'); if(g) g.textContent = formatTime(remaining); }catch(e){}
    if(board){
      board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
      makeBoard(board);
      populateBoard(board);
    }
    enableMoves();
    showLevelMode('puzzle');
    updateScores();
  }

  // WebSocket connection if configured
  const adminState = {
    progress: {
      A: { matched: 0, pairs: 0 },
      B: { matched: 0, pairs: 0 }
    },
    names: { A: 'A', B: 'B' }
  };

  function getTeamDisplayName(key){
    if(key === 'A') return adminState.names.A || 'A';
    if(key === 'B') return adminState.names.B || 'B';
    return String(key || '');
  }

  function normalizeTeamKey(teamValue){
    const raw = String(teamValue || '').trim();
    if(!raw) return '';
    if(/^A$/i.test(raw) || /^team\s*A$/i.test(raw) || /^teamA$/i.test(raw)) return 'A';
    if(/^B$/i.test(raw) || /^team\s*B$/i.test(raw) || /^teamB$/i.test(raw)) return 'B';
    const low = raw.toLowerCase();
    const aName = String(getTeamDisplayName('A') || '').trim().toLowerCase();
    const bName = String(getTeamDisplayName('B') || '').trim().toLowerCase();
    if(aName && low === aName) return 'A';
    if(bName && low === bName) return 'B';
    return '';
  }

  function setWinner(text){
    const w = document.getElementById('winner');
    if(w) w.textContent = text;
  }

  function updateWinnerFromTotals(){
    if(!winnerFromServer){
      setWinner('Pending (complete all 3 levels)');
    }
  }

  function setLastRound(text){
    const lr = document.getElementById('lastRound');
    if(lr) lr.textContent = text;
  }

  function updateLeadingTeamFromTotals(a, b){
    const scoreA = Number(a) || 0;
    const scoreB = Number(b) || 0;
    const nameA = getTeamDisplayName('A');
    const nameB = getTeamDisplayName('B');
    if(scoreA > scoreB){
      setLastRound(`Leading: ${nameA} (Team A) — ${scoreA} vs ${scoreB}`);
      return;
    }
    if(scoreB > scoreA){
      setLastRound(`Leading: ${nameB} (Team B) — ${scoreB} vs ${scoreA}`);
      return;
    }
    setLastRound(`Leading: Tie — ${scoreA} vs ${scoreB}`);
  }

  function resetAdminPanels(){
    try{
      const teamAPanel = document.getElementById('teamAPanel');
      const teamBPanel = document.getElementById('teamBPanel');
      const panels = [teamAPanel, teamBPanel].filter(Boolean);
      panels.forEach(el=>{
        const matchedEl = el.querySelector('.matched');
        const pctEl = el.querySelector('.completion');
        const scoreElA = el.querySelector('.score');
        const statusElA = el.querySelector('.team-status');
        if(matchedEl) matchedEl.textContent = '0 / 0';
        if(pctEl) pctEl.textContent = '0%';
        if(scoreElA) scoreElA.textContent = 'Score: 0';
        if(statusElA) statusElA.textContent = 'Waiting';
      });
    }catch(e){}
    adminState.progress.A = { matched: 0, pairs: 0 };
    adminState.progress.B = { matched: 0, pairs: 0 };
    winnerFromServer = false;
    updateWinnerFromTotals();
    setLastRound('Leading: —');
    try{ const cl = document.getElementById('currentLetter'); if(cl) cl.textContent = '—'; }catch(e){}
  }

  function applyAuthoritativeTimer(timer){
    if(!timer || typeof timer !== 'object') return;
    try{
      if(typeof timer.timeLimit !== 'undefined') timeLimit = Number(timer.timeLimit) || timeLimit;
      if(typeof timer.remaining !== 'undefined' && timer.remaining !== null){
        remaining = Number(timer.remaining);
      }
      const activeTimer = (levelMode === 'word' ? wordTimerEl : puzzleTimerEl);
      if(activeTimer && Number.isFinite(remaining)) activeTimer.textContent = formatTime(remaining);
      const g = document.getElementById('globalTimer'); if(g && Number.isFinite(remaining)) g.textContent = formatTime(remaining);

      if(timer.paused){
        clearInterval(interval);
        if(statusEl) statusEl.textContent = 'Paused';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Paused';
        return;
      }

      if(timer.running){
        started = true;
        if(finished){
          finished = false;
          enableMoves();
          enableWordInputs();
        }
        if(statusEl) statusEl.textContent = 'Game started';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Running';
      } else if(Number.isFinite(remaining) && remaining <= 0){
        finished = true;
        clearInterval(interval);
        disableMoves();
        disableWordInputs();
        if(statusEl) statusEl.textContent = 'Time is up';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Finished';
      }
    }catch(e){ console.error('apply authoritative timer failed', e); }
  }

  function applyAuthoritativeGameState(gs){
    if(!gs || typeof gs !== 'object') return;
    try{
      if(gs.names){
        if(gs.names.A) setTeamNameUI('A', gs.names.A);
        if(gs.names.B) setTeamNameUI('B', gs.names.B);
      }
      if(gs.level && typeof gs.level === 'object'){
        const cfgLevel = gs.level;
        const sig = JSON.stringify(cfgLevel);
        if(sig !== lastAuthoritativeLevelSig){
          lastAuthoritativeLevelSig = sig;
          if(cfgLevel.mode === 'memory') setupMemoryLevel(cfgLevel);
          else if(cfgLevel.mode === 'word') setupWordLevel(cfgLevel);
          else if(cfgLevel.mode === 'puzzle'){
            levelMode = 'puzzle';
            resetLocal();
          }
        }
      }
      if(gs.imageUrl) applyImage(gs.imageUrl);
      if(gs.timer) applyAuthoritativeTimer(gs.timer);
      if(gs.scores){
        const totalAEl = document.getElementById('totalA');
        const totalBEl = document.getElementById('totalB');
        if(totalAEl) totalAEl.textContent = String(Number(gs.scores.A) || 0);
        if(totalBEl) totalBEl.textContent = String(Number(gs.scores.B) || 0);
        updateWinnerFromTotals();
      }
      if(typeof gs.winnerName === 'string' && gs.winnerName){
        winnerFromServer = true;
        setWinner(gs.winnerName);
      }
    }catch(e){ console.error('apply gameState failed', e); }
  }

  if(cfg.ws){
    try{
      pubWs = new WebSocket(cfg.ws);
      pubWs.addEventListener('open', ()=>{
        console.log('WS connected to', cfg.ws);
        try{ pubWs.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){}
      });
      pubWs.addEventListener('close', ()=> scheduleWsRecovery('Connection lost. Reconnecting...'));
      pubWs.addEventListener('error', ()=> scheduleWsRecovery('Connection error. Reconnecting...'));
      pubWs.addEventListener('message', evt=>{
        try{
          const msg = JSON.parse(evt.data);
          if(msg.type === 'gameState'){
            applyAuthoritativeGameState(msg);
          } else if(msg.type === 'updateTeamName'){
            try{ setTeamNameUI(msg.team, msg.name); }catch(e){}
          } else if(msg.type === 'start'){
            startLocalTimer(msg.start, msg.timeLimit);
            // admin UI: update global timer and status
            try{ const g = document.getElementById('globalTimer'); if(g) g.textContent = formatTime(msg.timeLimit); const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Running'; }catch(e){}
          } else if(msg.type === 'reset'){
            resetLocal();
            try{ const g = document.getElementById('globalTimer'); if(g) g.textContent = '00:00'; const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Idle'; }catch(e){}
            resetAdminPanels();
          } else if(msg.type === 'image'){
            // apply new image URL and rebuild board
            if(msg.url){
              applyImage(msg.url);
              // ensure puzzle board is visible even if we were in memory mode
              if(levelMode !== 'puzzle'){
                levelMode = 'puzzle';
                resetLocal();
              }
            }
          } else if(msg.type === 'timer'){
            // authoritative timer tick from server
            try{
              if(typeof msg.remaining !== 'undefined'){
                remaining = msg.remaining;
                if(remaining > 0 && msg.status !== 'paused'){
                  if(finished){
                    finished = false;
                    enableMoves();
                    enableWordInputs();
                  }
                }
                const activeTimer = (levelMode === 'word' ? wordTimerEl : puzzleTimerEl);
                if(activeTimer) activeTimer.textContent = formatTime(remaining);
                // admin UI
                const g = document.getElementById('globalTimer'); if(g) g.textContent = formatTime(remaining);
              }
              // if server says finished, handle it
              if(msg.status === 'finished' || remaining <= 0){
                finished = true; clearInterval(interval); disableMoves(); if(statusEl) statusEl.textContent = 'Time is up';
                if(levelMode === 'word') disableWordInputs();
                // Make sure timeout score is added to previous levels (L1+L2+L3 total).
                if(!scoreRecorded) recordScoreAndAdvance('timeout', true, false);
              }
            }catch(e){console.error('timer msg error',e)}
          } else if(msg.type === 'pause'){
            // server paused the round
            try{ clearInterval(interval); if(statusEl) statusEl.textContent = 'Paused'; }catch(e){}
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Paused'; }catch(e){}
          } else if(msg.type === 'timerFinished'){
            // authoritative finish
            try{ finished = true; clearInterval(interval); disableMoves(); if(statusEl) statusEl.textContent = msg.reason ? `Ended (${msg.reason})` : 'Time finished'; }catch(e){}
            try{ if(levelMode === 'word') disableWordInputs(); }catch(e){}
            // Also submit this team's final score on timeout/force-end so totals accumulate.
            try{ if(!scoreRecorded) recordScoreAndAdvance(msg.reason || 'timeout', true, false); }catch(e){}
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Finished'; const g = document.getElementById('globalTimer'); if(g) g.textContent = '00:00'; }catch(e){}
          } else if(msg.type === 'teamProgress'){
            // update admin panels if present
            try{
              const p = msg.payload || {};
              let team = p.team || '';
              const matched = p.matched || 0; const pairs = p.pairs || 0;
              const pct = pairs>0 ? Math.round((matched/pairs)*100) : 0;
              // normalize team to single letter A/B when possible
              const teamKey = normalizeTeamKey(team);
              if(teamKey === 'A' || teamKey === 'B') adminState.progress[teamKey] = { matched, pairs };
              // prefer id like 'teamAPanel' but accept other forms
              const el = (teamKey ? document.getElementById('team' + teamKey + 'Panel') : null) || document.getElementById(team + 'Panel') || document.getElementById('team' + team + 'Panel');
              // compute score similar to how rounds record it: memory -> matched*10, puzzle -> percent
              let scoreDisplay = matched * 10;

              if(el){
                const matchedEl = el.querySelector('.matched');
                const pctEl = el.querySelector('.completion');
                const scoreElA = el.querySelector('.score');
                const statusElA = el.querySelector('.team-status');
                if(matchedEl) matchedEl.textContent = `${matched} / ${pairs}`;
                if(pctEl) pctEl.textContent = `${pct}%`;
                if(scoreElA) scoreElA.textContent = `Score: ${scoreDisplay}`;
                if(statusElA) statusElA.textContent = matched===pairs ? 'Finished' : 'Playing';
              }
            }catch(e){console.error(e)}
          } else if(msg.type === 'scoreUpdate'){
            try{
              const totals = msg.totals || {};
              if(msg.names && typeof msg.names === 'object'){
                if(msg.names.A){
                  adminState.names.A = msg.names.A;
                  setTeamNameUI('A', msg.names.A);
                }
                if(msg.names.B){
                  adminState.names.B = msg.names.B;
                  setTeamNameUI('B', msg.names.B);
                }
              }
              // prefer simple keys A/B but accept flexible names
              const a = totals['A'] || totals['Team A'] || totals['teamA'] || totals['a'] || 0;
              const b = totals['B'] || totals['Team B'] || totals['teamB'] || totals['b'] || 0;
              const totalAll = Object.keys(totals).reduce((sum, k)=> sum + (Number(totals[k]) || 0), 0);
              const totalAEl = document.getElementById('totalA');
              const totalBEl = document.getElementById('totalB');
              const totalSumEl = document.getElementById('totalSum');
              if(totalAEl) totalAEl.textContent = String(a);
              if(totalBEl) totalBEl.textContent = String(b);
              if(totalSumEl) totalSumEl.textContent = String(totalAll);
              try{
                const aNameEl = document.getElementById('teamAName');
                const bNameEl = document.getElementById('teamBName');
                const aTotalLabel = document.getElementById('totalALabel');
                const bTotalLabel = document.getElementById('totalBLabel');
                if(aNameEl) aNameEl.textContent = getTeamDisplayName('A');
                if(bNameEl) bNameEl.textContent = getTeamDisplayName('B');
                if(aTotalLabel) aTotalLabel.textContent = getTeamDisplayName('A');
                if(bTotalLabel) bTotalLabel.textContent = getTeamDisplayName('B');
              }catch(e){}
              updateLeadingTeamFromTotals(a, b);
              if(typeof msg.winnerName === 'string' && msg.winnerName){
                winnerFromServer = true;
                setWinner(msg.winnerName);
              } else {
                winnerFromServer = false;
                updateWinnerFromTotals();
              }
            }catch(e){console.error(e)}
          } else if(msg.type === 'level'){
            // incoming level config: { type: 'level', mode: 'memory', pairs:5, timeLimit:60, level:2 }
            try{
              const cfgLevel = msg;
              if(cfgLevel.mode === 'memory'){
                setupMemoryLevel(cfgLevel);
              } else if(cfgLevel.mode === 'word'){
                setupWordLevel(cfgLevel);
              } else if(cfgLevel.mode === 'puzzle'){
                currentLevel = Number(cfgLevel.level) || 1;
                GAME.currentLevel = currentLevel;
                // switch to standard puzzle image if provided
                if(cfgLevel.url) applyImage(cfgLevel.url);
                // reset to puzzle
                levelMode = 'puzzle';
                resetLocal();
              }
              // update admin UI current level and status
              try{ const cl = document.getElementById('currentLevel'); if(cl) cl.textContent = cfgLevel.level || cfgLevel.mode || '—'; const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Ready'; }catch(e){}
            }catch(e){ console.error('apply level failed', e); }
          } else if(msg.type === 'next'){
            if(msg.url){ applyImage(msg.url); resetLocal(); }
          } else if(msg.type === 'roundComplete'){
            // another client completed the round — freeze this client
            try{
              if(!finished){
                finished = true;
                clearInterval(interval);
                if(statusEl) statusEl.textContent = msg.payload && msg.payload.team ? `${msg.payload.team} completed the puzzle` : 'Round complete';
                disableMoves();
                if(levelMode === 'word') disableWordInputs();
                // Record this team's current round score as well so totals across
                // puzzle + memory + word are summed fairly for both teams.
                if(!scoreRecorded) recordScoreAndAdvance('otherComplete', true, false);
              }
              // show current leader (previous total + current round score)
              try{
                const lr = msg.payload || {};
                const lrTeamKey = normalizeTeamKey(lr.team || lr.teamDisplay);
                const roundScore = Math.max(0, Number(lr.score) || 0);
                const totalAEl = document.getElementById('totalA');
                const totalBEl = document.getElementById('totalB');
                let aNow = Number(totalAEl && totalAEl.textContent) || 0;
                let bNow = Number(totalBEl && totalBEl.textContent) || 0;
                if(lrTeamKey === 'A') aNow += roundScore;
                if(lrTeamKey === 'B') bNow += roundScore;
                updateLeadingTeamFromTotals(aNow, bNow);
                updateWinnerFromTotals();
              }catch(e){}
            }catch(e){ console.error('handling roundComplete', e); }
          }
        }catch(e){console.error(e)}
      });
    }catch(e){console.error('WS connect failed', e)}
  }

  function applyImage(url){
    if(!url) return;
    const normalizedUrl = normalizeSharedImageUrl(url);
    if(normalizedUrl === imageUrl) return;
    imageUrl = normalizedUrl;
    solvedPreviewActive = false;
    solvedPreviewSnapshot = null;
    // update preview if present
    const preview = document.getElementById('imagePreview');
    if(preview) preview.src = normalizedUrl;
    // rebuild board pieces using the new image
    if(board){
      board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
      makeBoard(board);
      populateBoard(board);
      updateScores();
    }
  }

  function showOnly(sectionId){
    const sections = document.querySelectorAll('.level-section');
    sections.forEach(section=>{
      const isTarget = section.id === sectionId;
      section.classList.toggle('hidden', !isTarget);
    });
  }

  function showLevelMode(mode){
    const showWord = mode === 'word';
    showOnly(showWord ? 'wordLevel' : 'levelPuzzle');
    if(holdShowBtn) holdShowBtn.classList.toggle('hidden', showWord || mode === 'memory');
    if(mode !== 'puzzle'){
      solvedPreviewActive = false;
      solvedPreviewSnapshot = null;
    }
    if(board){
      board.classList.toggle('hidden', showWord);
      board.classList.toggle('word-hidden', showWord);
      if(showWord){
        if(!board.dataset.prevDisplay) board.dataset.prevDisplay = board.style.display || '';
        board.style.display = 'none';
        board.style.visibility = 'hidden';
        board.style.pointerEvents = 'none';
        board.style.width = '0px';
        board.style.height = '0px';
        board.innerHTML = '';
      }else{
        board.style.display = board.dataset.prevDisplay || '';
        board.style.visibility = '';
        board.style.pointerEvents = '';
        board.style.width = 'var(--board-size)';
        board.style.height = 'var(--board-size)';
        delete board.dataset.prevDisplay;
      }
    }
  }

  function resetWordUI(){
    if(wordSection){
      showLevelMode('puzzle');
    }
    if(wordLetterEl) wordLetterEl.textContent = '—';
    if(wordCategoriesEl) wordCategoriesEl.innerHTML = '';
    if(wordStatusEl) wordStatusEl.textContent = '';
    if(submitWordsBtn) submitWordsBtn.disabled = false;
  }

  function enableWordInputs(){
    if(levelMode !== 'word') return;
    if(!wordSection) return;
    const inputs = wordSection.querySelectorAll('input.word-input');
    inputs.forEach(i=> i.disabled = false);
    if(submitWordsBtn) submitWordsBtn.disabled = false;
  }

  function disableWordInputs(){
    if(!wordSection) return;
    const inputs = wordSection.querySelectorAll('input.word-input');
    inputs.forEach(i=> i.disabled = true);
    if(submitWordsBtn) submitWordsBtn.disabled = true;
  }

  function randomLetter(){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
  }

  function setupWordLevel(cfgLevel){
    levelMode = 'word';
    currentLevel = Number(cfgLevel.level) || 3;
    GAME.currentLevel = currentLevel;
    scoreRecorded = false;
    finished = false;
    const letter = (cfgLevel.letter || randomLetter()).toUpperCase();
    const categories = Array.isArray(cfgLevel.categories) && cfgLevel.categories.length ? cfgLevel.categories : WORD_CATEGORIES.slice();
    wordState = { letter, categories, answers: {}, correctCount: 0, total: categories.length };
    if(wordLetterEl) wordLetterEl.textContent = letter;
    try{ const cl = document.getElementById('currentLetter'); if(cl) cl.textContent = letter; }catch(e){}
    if(wordCategoriesEl){
      wordCategoriesEl.innerHTML = '';
      categories.forEach((cat, idx)=>{
        const row = document.createElement('div');
        row.className = 'category-row';
        const label = document.createElement('label');
        label.textContent = cat;
        label.setAttribute('for', `word-${idx}`);
        const input = document.createElement('input');
        input.id = `word-${idx}`;
        input.className = 'word-input';
        input.type = 'text';
        input.placeholder = `Starts with ${letter}`;
        input.dataset.category = cat;
        input.addEventListener('input', ()=>{ input.classList.remove('invalid'); input.classList.remove('skipped'); });
        row.appendChild(label);
        row.appendChild(input);
        wordCategoriesEl.appendChild(row);
      });
    }
    if(wordStatusEl) wordStatusEl.textContent = 'Enter words that start with the letter. Leave blank to skip.';
    if(wordScoreEl) wordScoreEl.textContent = 'Score: 0';
    if(wordCompletionEl) wordCompletionEl.textContent = 'Completion: 0%';
    showLevelMode('word');
    enableWordInputs();
  }

  function generateRandomLetter(){
    const letter = randomLetter();
    setupWordLevel({ mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() });
  }

  function updateTotalScore(team){
    const totalAEl = document.getElementById('totalA');
    const totalBEl = document.getElementById('totalB');
    if(!totalAEl || !totalBEl) return;
    const a = Number(totalAEl.textContent) || 0;
    const b = Number(totalBEl.textContent) || 0;
    if(team === 'A') totalAEl.textContent = String(a);
    if(team === 'B') totalBEl.textContent = String(b);
    updateWinnerFromTotals();
  }

  function submitWords(team, correctAnswersCount){
    const score = (Number(correctAnswersCount) || 0) * 10;
    if(team === 'A' || team === 'B'){
      GAME[team].level3Score = score;
      updateTotalScore(team);
    }
  }

  function startLevel3(){
    currentLevel = 3;
    GAME.currentLevel = 3;
    levelMode = 'word';

    // Hide all other levels
    showOnly('wordLevel');

    // Reset word score and completion
    if (wordScoreEl) wordScoreEl.textContent = 'Score: 0';
    if (wordCompletionEl) wordCompletionEl.textContent = 'Completion: 0%';

    // Stop Level 1 timer
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    generateRandomLetter();
  }

  function updateWordProgress(){
    if(!wordState) return;
    const matched = wordState.correctCount || 0;
    const pairs = wordState.total || 0;
    const pct = pairs > 0 ? Math.round((matched / pairs) * 100) : 0;
    if(wordScoreEl) wordScoreEl.textContent = `Score: ${matched * 10}`;
    if(wordCompletionEl) wordCompletionEl.textContent = `Completion: ${pct}%`;
    try{
      const msg = { type: 'progress', payload: { team: cfg.team || 'unknown', matched, pairs, remaining } };
      if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(msg));
    }catch(e){ console.error('word progress send failed', e); }
  }

  function normalizeWordCategory(label){
    const l = String(label || '').toLowerCase();
    if(l.includes('country')) return 'countries';
    if(l.includes('food')) return 'foods';
    if(l.includes('drink')) return 'drinks';
    if(l.includes('animal')) return 'animals';
    return '';
  }

  function isValidWordForCategory(raw, categoryLabel, letter){
    const normalized = raw.toUpperCase();
    const startsOk = normalized.startsWith(letter);
    const spellingOk = /^[A-Za-z][A-Za-z\s'’\-]*$/.test(raw);
    if(!startsOk || !spellingOk) return false;
    const key = normalizeWordCategory(categoryLabel);
    if(key && data[key] && data[key][letter]){
      return compareInput(key, letter, raw) === 1;
    }
    return true;
  }

  function validateWordSubmission(){
    if(levelMode !== 'word' || finished || !wordState) return;
    const letter = wordState.letter.toUpperCase();
    const inputs = wordSection ? Array.from(wordSection.querySelectorAll('input.word-input')) : [];
    const seen = new Set();
    let correct = 0;
    let invalidCount = 0;
    const answers = {};
    inputs.forEach(input=>{
      const raw = (input.value || '').trim();
      const categoryLabel = input.dataset.category || input.id || '';
      input.classList.remove('invalid');
      input.classList.remove('skipped');
      if(!raw){
        input.classList.add('skipped');
        return;
      }
      const normalized = raw.toUpperCase();
      if(seen.has(normalized)){
        input.classList.add('invalid');
        invalidCount += 1;
        return;
      }
      if(!isValidWordForCategory(raw, categoryLabel, letter)){
        input.classList.add('invalid');
        invalidCount += 1;
        return;
      }
      seen.add(normalized);
      answers[categoryLabel] = raw;
      correct += 1;
    });

    wordState.answers = answers;
    wordState.correctCount = correct;
    updateWordProgress();

    if(invalidCount > 0){
      if(wordStatusEl) wordStatusEl.textContent = `Saved ${correct} correct ${correct === 1 ? 'answer' : 'answers'}. Fix ${invalidCount} invalid or repeated ${invalidCount === 1 ? 'answer' : 'answers'} to improve your score.`;
    } else {
      if(wordStatusEl) wordStatusEl.textContent = correct === wordState.total ? 'All categories completed correctly!' : 'Answers submitted. You can improve before time runs out.';
    }

    if(correct === wordState.total){
      finished = true;
      disableWordInputs();
      recordScoreAndAdvance('complete');
    }
  }

  // If we are a team page, build board
  if(board){
    makeBoard(board);
    populateBoard(board);
    if(puzzleTimerEl) puzzleTimerEl.textContent = formatTime(timeLimit);
    if(wordTimerEl) wordTimerEl.textContent = formatTime(timeLimit);
    updateScores();
  }

  // Memory level implementation
  function setupMemoryLevel(cfgLevel){
    // cfgLevel: { mode: 'memory', pairs: 5, timeLimit: 60, level: 2, items: optional array }
    levelMode = 'memory';
    currentLevel = Number(cfgLevel.level) || 2;
    GAME.currentLevel = currentLevel;
    scoreRecorded = false;
    memoryState = { pairs: cfgLevel.pairs || 4, timeLimit: cfgLevel.timeLimit || 60, level: cfgLevel.level || 0 };
    showLevelMode('memory');
    if(board){
      board.classList.remove('hidden');
      board.style.display = 'grid';
      board.style.visibility = '';
      board.style.pointerEvents = '';
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
    }
    // build a grid of cards (pairs*2)
    if(!board) return;
    // create items array: if provided use items else use numbers
    const pairs = memoryState.pairs;
    let items = cfgLevel.items && Array.isArray(cfgLevel.items) ? cfgLevel.items.slice(0,pairs) : null;
    if(!items){ items = []; for(let i=1;i<=pairs;i++) items.push(String(i)); }
    // duplicate and shuffle
    const cards = [];
    items.forEach(it=>{ cards.push({val:it}); cards.push({val:it}); });
    shuffleArray(cards);
    // clear and build slots
    board.innerHTML = '';
    const total = cards.length;
    // choose number of columns: use full-width layout (4 columns) for more than 4 cards,
    // otherwise use one column per card so they fill horizontally
    const cols = (total === 8) ? 4 : (total <= 4 ? total : 4);
    const rows = Math.ceil(total / cols);
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    board.style.width = 'var(--board-size)';
    board.style.height = 'var(--board-size)';
    for(let i=0;i<total;i++){
      const slot = document.createElement('div');
      slot.className = 'slot memory-slot';
      slot.dataset.index = i;
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.val = cards[i].val;
      card.textContent = '';
      card.addEventListener('click', onMemoryClick);
      slot.appendChild(card);
      board.appendChild(slot);
    }
    // show all briefly then hide, then initialise memory state
    const allCards = board.querySelectorAll('.card');
    allCards.forEach(c=>{ c.textContent = c.dataset.val; });
    setTimeout(()=>{
      allCards.forEach(c=> c.textContent = '');
      // start memory state
      memoryState.opened = [];
      memoryState.matched = 0;
      memoryState.mistakes = 0;
      memoryState.started = true;
      remaining = memoryState.timeLimit;
      const activeTimer = (levelMode === 'word' ? wordTimerEl : puzzleTimerEl);
      if(activeTimer) activeTimer.textContent = formatTime(remaining);
      // clear existing local interval; server will broadcast authoritative ticks
      clearInterval(interval);
    }, 2000);
  }

  function onMemoryClick(e){
    if(levelMode !== 'memory' || finished) return;
    const btn = e.currentTarget;
    if(btn.classList.contains('matched')) return;
    // if no card is open -> reveal as preview and auto-hide after 1s
    if(!memoryState.opened || memoryState.opened.length === 0){
      // reveal preview
      btn.textContent = btn.dataset.val;
      memoryState.opened = [btn];
      // auto-hide preview after 1s unless a second click occurs
      if(memoryState.previewTimeout) clearTimeout(memoryState.previewTimeout);
      memoryState.previewTimeout = setTimeout(()=>{
        try{ if(memoryState.opened && memoryState.opened[0]) memoryState.opened[0].textContent = ''; }catch(e){}
        memoryState.opened = [];
        memoryState.previewTimeout = null;
      }, 1000);
      return;
    }
    // if one preview is open and another card clicked -> cancel preview hide and evaluate
    if(memoryState.opened.length === 1){
      const first = memoryState.opened[0];
      // ignore clicking the same card twice
      if(first === btn) return;
      // cancel auto-hide so both remain visible for match check
      if(memoryState.previewTimeout) { clearTimeout(memoryState.previewTimeout); memoryState.previewTimeout = null; }
      // reveal second card
      btn.textContent = btn.dataset.val;
      const a = first, b = btn;
      if(a.dataset.val === b.dataset.val){
        a.classList.add('matched'); b.classList.add('matched');
        memoryState.matched += 1;
        // update visible score immediately
        const currentPoints = (memoryState.matched * 10);
        if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${currentPoints}`;
        memoryState.opened = [];
        // send progress update to server/admin
        try{ const m = { type: 'progress', payload: { team: cfg.team || 'unknown', matched: memoryState.matched, pairs: memoryState.pairs, remaining } };
          console.debug('Sending memory progress:', m);
          if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(m));
        }catch(e){ console.error('memory progress send failed', e); }
        if(memoryState.matched === memoryState.pairs){
          // level complete
          clearInterval(interval);
          finished = true;
          disableMoves();
          recordScoreAndAdvance('complete');
        }
      }else{
        memoryState.mistakes++;
        // leave visible briefly then hide both
        setTimeout(()=>{ try{ a.textContent=''; b.textContent=''; }catch(e){}; memoryState.opened = []; }, 700);
      }
    }
  }

  function captureBoardState(){
    if(!board) return null;
    const slots = Array.from(board.children);
    return slots.map(slot=>{
      const piece = slot.firstElementChild;
      return piece ? String(piece.dataset.correct) : null;
    });
  }

  function setBoardToSolved(){
    if(!board) return;
    const slots = Array.from(board.children);
    const piecesByCorrect = new Map();
    Array.from(board.querySelectorAll('.piece')).forEach(piece=>{
      piecesByCorrect.set(String(piece.dataset.correct), piece);
    });
    slots.forEach((slot, idx)=>{
      const solvedPiece = piecesByCorrect.get(String(idx));
      if(solvedPiece) slot.appendChild(solvedPiece);
    });
  }

  function restoreBoardState(snapshot){
    if(!board || !Array.isArray(snapshot)) return;
    const slots = Array.from(board.children);
    const piecesByCorrect = new Map();
    Array.from(board.querySelectorAll('.piece')).forEach(piece=>{
      piecesByCorrect.set(String(piece.dataset.correct), piece);
    });
    slots.forEach((slot, idx)=>{
      const id = snapshot[idx];
      if(id == null) return;
      const piece = piecesByCorrect.get(String(id));
      if(piece) slot.appendChild(piece);
    });
  }

  function setSolvedPreviewVisible(isVisible){
    if(levelMode !== 'puzzle' || !board) return;
    if(isVisible){
      if(solvedPreviewActive) return;
      solvedPreviewSnapshot = captureBoardState();
      setBoardToSolved();
      solvedPreviewActive = true;
      return;
    }
    if(!solvedPreviewActive) return;
    restoreBoardState(solvedPreviewSnapshot);
    solvedPreviewSnapshot = null;
    solvedPreviewActive = false;
    updateScores();
  }

  if(holdShowBtn){
    const startPreview = (e)=>{ if(e) e.preventDefault(); setSolvedPreviewVisible(true); };
    const stopPreview = (e)=>{ if(e) e.preventDefault(); setSolvedPreviewVisible(false); };

    holdShowBtn.addEventListener('mousedown', startPreview);
    holdShowBtn.addEventListener('touchstart', startPreview, { passive: false });
    holdShowBtn.addEventListener('mouseup', stopPreview);
    holdShowBtn.addEventListener('mouseleave', stopPreview);
    holdShowBtn.addEventListener('touchend', stopPreview);
    holdShowBtn.addEventListener('touchcancel', stopPreview);
    holdShowBtn.addEventListener('blur', stopPreview);

    window.addEventListener('mouseup', stopPreview);
    window.addEventListener('touchend', stopPreview);
    window.addEventListener('touchcancel', stopPreview);
  }

  // If admin controls exist on page, set them up to broadcast via WebSocket (admin page will create its own ws)
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timeInput = document.getElementById('timeInput');
  const adminWsUrl = cfg.adminWs || cfg.ws;
  if(startBtn && resetBtn && adminWsUrl){
    const adminWs = new WebSocket(adminWsUrl);
    const _adminQueue = [];
    function sendAdmin(msgObj){
      const payload = JSON.stringify(msgObj);
      if(adminWs.readyState === WebSocket.OPEN){
        try{ adminWs.send(payload); }catch(e){ console.error('adminWs send failed', e); }
      }else{
        // queue until open
        _adminQueue.push(payload);
      }
    }
    adminWs.addEventListener('open', ()=>{
      console.log('admin ws open');
      try{ const s = document.getElementById('status'); if(s) s.textContent = 'Connected'; }catch(e){}
      try{ adminWs.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){}
      // flush queue
      while(_adminQueue.length){
        const p = _adminQueue.shift();
        try{ adminWs.send(p); }catch(e){ console.error('adminWs queued send failed', e); }
      }
    });
    adminWs.addEventListener('close', ()=> scheduleWsRecovery('Admin connection lost. Reconnecting...'));
    adminWs.addEventListener('error', ()=> scheduleWsRecovery('Admin connection error. Reconnecting...'));
    // image controls (admin page)
    const setImageBtn = document.getElementById('setImageBtn');
    const imageInput = document.getElementById('imageInput');
    const imageFileInput = document.getElementById('imageFileInput');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imagePreview = document.getElementById('imagePreview');
    if(imagePreview && imageUrl) imagePreview.src = imageUrl;

    // admin level controls
    const level1Btn = document.getElementById('level1Btn');
    const level2Btn = document.getElementById('level2Btn');
    const level3Btn = document.getElementById('level3Btn');
    const letterInput = document.getElementById('letterInput');
    const levelNumber = document.getElementById('levelNumber');
    const startLevelBtn = document.getElementById('startLevelBtn');
    function sendLevelPayload(payload){
      try{ sendAdmin(payload); }catch(e){ console.error('send level failed', e); }
    }
    if(level1Btn){
      level1Btn.addEventListener('click', ()=>{
        // Level 1 = puzzle: use current image or imageInput
        const url = normalizeSharedImageUrl((imageInput && imageInput.value && imageInput.value.trim()) || imageUrl);
        const payload = { type: 'level', mode: 'puzzle', level: 1, url };
        sendLevelPayload(payload);
      });
    }
    if(level2Btn){
      level2Btn.addEventListener('click', ()=>{
        const payload = { type: 'level', mode: 'memory', pairs: 4, timeLimit: 60, level: 2 };
        sendLevelPayload(payload);
      });
    }
    if(level3Btn){
      level3Btn.addEventListener('click', ()=>{
        const letter = (letterInput && letterInput.value && letterInput.value.trim()) ? letterInput.value.trim().charAt(0).toUpperCase() : randomLetter();
        const payload = { type: 'level', mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() };
        sendLevelPayload(payload);
      });
    }
    if(startLevelBtn && levelNumber){
      startLevelBtn.addEventListener('click', ()=>{
        const n = parseInt(levelNumber.value,10) || 1;
        if(n===2){
          const payload = { type: 'level', mode: 'memory', pairs: 4, timeLimit: 60, level: 2 };
          sendLevelPayload(payload);
        }else if(n===3){
          const letter = (letterInput && letterInput.value && letterInput.value.trim()) ? letterInput.value.trim().charAt(0).toUpperCase() : randomLetter();
          const payload = { type: 'level', mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() };
          sendLevelPayload(payload);
        }else{
          const url = normalizeSharedImageUrl((imageInput && imageInput.value && imageInput.value.trim()) || imageUrl);
          const payload = { type: 'level', mode: 'puzzle', level: n, url };
          sendLevelPayload(payload);
        }
      });
    }

    if(setImageBtn && imageInput){
      setImageBtn.addEventListener('click', ()=>{
        const url = normalizeSharedImageUrl(imageInput.value && imageInput.value.trim());
        if(!url) return;
        sendAdmin({type:'image', url});
        try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image queued'; }catch(e){}
      });
    }

    // local file upload -> read as data URL and broadcast
    if(uploadImageBtn && imageFileInput){
      async function handleImageUpload(file){
        if(!file) return alert('Choose a file first');
        try{ const s = document.getElementById('status'); if(s) s.textContent = 'Uploading image...'; }catch(e){}
        try{
          const uploadedUrl = await uploadImageFile(file);
          if(imageInput) imageInput.value = uploadedUrl;
          sendAdmin({type:'image', url: uploadedUrl});
          try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image queued'; }catch(e){}
        }catch(err){
          console.error('image upload failed', err);
          try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image upload failed'; }catch(e){}
        }
      }

      uploadImageBtn.addEventListener('click', ()=>{
        const file = imageFileInput.files && imageFileInput.files[0];
        handleImageUpload(file);
      });

      // preview selected file immediately and auto-send
      imageFileInput.addEventListener('change', ()=>{
        const f = imageFileInput.files && imageFileInput.files[0];
        if(!f) return;
        const objUrl = URL.createObjectURL(f);
        if(imagePreview) imagePreview.src = objUrl;
        // revoke after load to free memory
        if(imagePreview) imagePreview.onload = ()=> URL.revokeObjectURL(objUrl);
        handleImageUpload(f);
      });
    }
    startBtn.addEventListener('click', ()=>{
      const tl = parseInt(timeInput.value,10) || 120;
      const payload = {type:'start', start: Date.now(), timeLimit: tl};
      sendAdmin(payload);
    });
    const pauseBtn = document.getElementById('pauseBtn');
    const forceEndBtn = document.getElementById('forceEndBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    if(pauseBtn){ pauseBtn.addEventListener('click', ()=> sendAdmin({ type: 'pause' })); }
    if(forceEndBtn){ forceEndBtn.addEventListener('click', ()=> sendAdmin({ type: 'forceEnd' })); }
    if(nextBtn){ nextBtn.addEventListener('click', ()=> sendAdmin({ type: 'next' })); }
    if(resetAllBtn){ resetAllBtn.addEventListener('click', ()=> sendAdmin({ type: 'resetAll' })); }
    resetBtn.addEventListener('click', ()=>{
      sendAdmin({type:'reset'});
    });
  }

  if(submitWordsBtn){
    submitWordsBtn.addEventListener('click', validateWordSubmission);
  }

  const socket = new WebSocket(cfg.ws || cfg.adminWs || 'ws://localhost:8000');
  socket.addEventListener('open', ()=>{ try{ socket.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){} });
  socket.addEventListener('close', ()=> scheduleWsRecovery('Connection lost. Reconnecting...'));
  socket.addEventListener('error', ()=> scheduleWsRecovery('Connection error. Reconnecting...'));

  // Notify server of team name changes
  if (setTeamANameBtn) {
    setTeamANameBtn.addEventListener('click', () => {
      const newName = (teamANameInput && teamANameInput.value ? teamANameInput.value : '').trim();
      if (newName) {
        setTeamNameUI('A', newName);
        socket.send(JSON.stringify({ type: 'updateTeamName', team: 'A', name: newName }));
      }
    });
  }

  if (setTeamBNameBtn) {
    setTeamBNameBtn.addEventListener('click', () => {
      const newName = (teamBNameInput && teamBNameInput.value ? teamBNameInput.value : '').trim();
      if (newName) {
        setTeamNameUI('B', newName);
        socket.send(JSON.stringify({ type: 'updateTeamName', team: 'B', name: newName }));
      }
    });
  }

  // Listen for team name updates from the server
  socket.addEventListener('message', (event) => {
    let data;
    try{
      data = JSON.parse(event.data);
    }catch(e){
      return;
    }
    if (data.type === 'updateTeamName') {
      setTeamNameUI(data.team, data.name);
    }
  });
})();
