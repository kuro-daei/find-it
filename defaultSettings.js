const defaultSettings = {
  systemPrompt:
    "Analyze the input query and determine the most appropriate information sources based on the query's nature and intent. Consider combining multiple sources when beneficial. The goal is to understand the user's intention and select the sources that will provide the most effective search results. Note: The (query) placeholder in URLs will be replaced with the actual search term.",
  sections: [
    {
      title: "perplexity",
      details:
        "AI-powered search engine that provides comprehensive answers with source citations. Excels at academic research, technical explanations, and complex queries. Features real-time information and multi-source synthesis for accurate, up-to-date results.",
      url: "https://www.perplexity.ai/search/new?q=(query)",
    },
    {
      title: "amazon",
      details:
        "Leading e-commerce platform with extensive product selection and Prime shipping. Features detailed product specifications, verified customer reviews, and price tracking. Offers both global brands and Japan-exclusive items with reliable delivery.",
      url: "https://amazon.co.jp/s?k=(query)",
    },
  ],
};
