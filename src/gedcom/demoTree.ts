/**
 * GED Scout - Fictional Demo Benchmark Dataset
 * "The Whimsical Vance Dynasty"
 * Clearly labeled fictional GEDCOM file engineered to trigger at least one finding
 * in every validation rule and category.
 */

export const DEMO_GEDCOM_STRING = `0 HEAD
1 SOUR GED_SCOUT_BENCHMARK
2 NAME The Whimsical Vance Dynasty (Fictional Test Suite)
2 VERS 1.0.0
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 DATE 10 OCT 2026
1 NOTE FICTIONAL DEMO TREE FOR GED SCOUT INTEGRITY TESTING.
0 @S1@ SOUR
1 TITL 1851 Census of Great Britain
1 AUTH General Register Office
0 @S2@ SOUR
1 TITL St. Jude Parish Parish Register (1790-1880)
1 AUTH Diocese of York
0 @I1@ INDI
1 NAME Barnaby /Vance/
2 GIVN Barnaby
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 14 JUN 1890
2 PLAC Leeds, Yorkshire, England
2 SOUR @S1@
1 DEAT
2 DATE 10 MAY 1880
2 PLAC Leeds, Yorkshire, England
2 SOUR @S1@
1 FAMS @F1@
0 @I2@ INDI
1 NAME Silas /Vance/
2 GIVN Silas
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 12 APR 1820
2 PLAC Bradford, England
2 SOUR @S2@
1 DEAT
2 DATE 18 NOV 1885
2 PLAC Bradford, England
2 SOUR @S2@
1 BURI
2 DATE 05 JUN 1870
2 PLAC Bradford Cemetery, England
1 FAMS @F2@
0 @I3@ INDI
1 NAME Cordelia /Vance/
2 GIVN Cordelia
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 15 AUG 1850
2 PLAC Manchester, England
2 SOUR @S1@
1 FAMS @F3@
0 @I4@ INDI
1 NAME Arthur /Pendleton/
2 GIVN Arthur
2 SURN Pendleton
1 SEX M
1 BIRT
2 DATE 10 JAN 1840
2 PLAC Manchester, England
2 SOUR @S1@
1 FAMS @F3@
0 @I5@ INDI
1 NAME Tabitha /Vance/
2 GIVN Tabitha
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 1860
2 PLAC Ripon, England
2 SOUR @S2@
1 FAMS @F4@
0 @I6@ INDI
1 NAME Young Pip /Vance/
2 GIVN Young Pip
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 1870
2 PLAC Ripon, England
2 SOUR @S2@
1 FAMC @F4@
0 @I7@ INDI
1 NAME Henrietta /Vance/
2 GIVN Henrietta
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 1800
2 PLAC York, England
2 SOUR @S2@
1 FAMS @F5@
0 @I8@ INDI
1 NAME Lateborn Lucy /Vance/
2 GIVN Lateborn Lucy
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 1862
2 PLAC York, England
2 SOUR @S2@
1 FAMC @F5@
0 @I9@ INDI
1 NAME Archibald /Vance/
2 GIVN Archibald
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 1815
2 PLAC Sheffield, England
2 SOUR @S1@
1 DEAT
2 DATE 10 JAN 1880
2 PLAC Sheffield, England
2 SOUR @S1@
1 FAMS @F6@
0 @I10@ INDI
1 NAME Posthumous Peter /Vance/
2 GIVN Posthumous Peter
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 14 DEC 1882
2 PLAC Sheffield, England
2 SOUR @S1@
1 FAMC @F6@
0 @I11@ INDI
1 NAME Methuselah /Vance/
2 GIVN Methuselah
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 1780
2 PLAC Hull, England
2 SOUR @S2@
1 DEAT
2 DATE 1905
2 PLAC Hull, England
2 SOUR @S2@
0 @I12@ INDI
1 NAME Gwendolyn /Vance/
2 GIVN Gwendolyn
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 1810
2 PLAC Halifax, England
2 SOUR @S1@
1 DEAT
2 DATE 1914
2 PLAC Halifax, England
2 SOUR @S1@
0 @I13@ INDI
1 NAME Jonathan /Vance/
2 GIVN Jonathan
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 15 MAY 1842
2 PLAC Whitby, England
2 SOUR @S2@
1 FAMS @F7@
0 @I14@ INDI
1 NAME Jonathon /Vance/
2 GIVN Jonathon
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 1843
2 PLAC Whitby, England
2 SOUR @S2@
0 @I15@ INDI
1 NAME Solitary Sam /Vance/
2 GIVN Solitary Sam
2 SURN Vance
1 SEX M
1 BIRT
2 DATE Abt 1845
2 PLAC Scarborough, England
0 @I16@ INDI
1 NAME Mysterious Alex /Vance/
2 GIVN Mysterious Alex
2 SURN Vance
1 BIRT
2 DATE circa 1865?
2 PLAC Harrogate, England
0 @I17@ INDI
1 NAME Prudence /Vance/
2 GIVN Prudence
2 SURN Vance
1 SEX F
1 BIRT
2 DATE between 1835-1840
2 PLAC Knaresborough, England
1 DEAT
2 DATE 1902
2 PLAC Knaresborough, England
0 @I18@ INDI
1 NAME Orphan Oliver /Vance/
2 GIVN Orphan Oliver
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 1888
2 PLAC Richmond, England
1 FAMC @F8@
0 @I19@ INDI
1 NAME Edward /Vance/
2 GIVN Edward
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 12 JAN 1830
2 PLAC Leeds, England
2 SOUR @S1@
1 FAMS @F9@
0 @I20@ INDI
1 NAME Beatrice /Vance/
2 GIVN Beatrice
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 04 MAR 1834
2 PLAC Leeds, England
2 SOUR @S1@
1 FAMS @F9@
0 @I21@ INDI
1 NAME Charles /Vance/
2 GIVN Charles
2 SURN Vance
1 SEX M
1 BIRT
2 DATE 22 SEP 1858
2 PLAC Leeds, England
2 SOUR @S1@
1 FAMC @F9@
0 @F1@ FAM
1 HUSB @I1@
0 @F2@ FAM
1 HUSB @I2@
0 @F3@ FAM
1 HUSB @I4@
1 WIFE @I3@
1 MARR
2 DATE 1845
2 PLAC Manchester, England
2 SOUR @S1@
0 @F4@ FAM
1 WIFE @I5@
1 CHIL @I6@
0 @F5@ FAM
1 WIFE @I7@
1 CHIL @I8@
0 @F6@ FAM
1 HUSB @I9@
1 CHIL @I10@
0 @F7@ FAM
1 HUSB @I13@
0 @F8@ FAM
1 CHIL @I18@
0 @F9@ FAM
1 HUSB @I19@
1 WIFE @I20@
1 CHIL @I21@
1 MARR
2 DATE 15 MAY 1855
2 PLAC Leeds, England
2 SOUR @S1@
0 TRLR
`;
