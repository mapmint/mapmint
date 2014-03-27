<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:ows="http://www.opengis.net/ows/1.1"
                xmlns:wps="http://www.opengis.net/wps/1.0.0"
                xmlns:xlink="http://www.w3.org/1999/xlink">

  <xsl:output method="text"/>

  <xsl:template match="/connection">
    <xsl:text>PG:</xsl:text>
    <xsl:for-each select="./*">
	<xsl:text> </xsl:text><xsl:value-of select="name(.)" /><xsl:text>=</xsl:text><xsl:copy-of select="." />
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>
